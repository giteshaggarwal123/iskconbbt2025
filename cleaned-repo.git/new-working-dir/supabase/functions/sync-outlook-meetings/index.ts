
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Syncing meetings for user:', user_id)

    // Get user's Microsoft access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('microsoft_access_token, microsoft_refresh_token')
      .eq('id', user_id)
      .single()

    if (profileError || !profile?.microsoft_access_token) {
      console.error('Profile error or no token:', profileError)
      return new Response(
        JSON.stringify({ error: 'Microsoft account not connected or token expired' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Fetching meetings from Microsoft Graph API...')

    // Get current time for filtering future meetings
    const now = new Date()
    const filterDate = now.toISOString()

    // Fetch meetings from Microsoft Graph API with expanded fields
    const graphResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendar/events?$filter=start/dateTime ge '${filterDate}'&$orderby=start/dateTime&$top=50&$expand=attachments&$select=id,subject,body,bodyPreview,start,end,location,onlineMeeting,attendees,isAllDay,importance,sensitivity,showAs,responseStatus,organizer,webLink`,
      {
        headers: {
          'Authorization': `Bearer ${profile.microsoft_access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'outlook.timezone="UTC"'
        }
      }
    )

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text()
      console.error('Microsoft Graph API error:', errorText, 'Status:', graphResponse.status)
      
      // If token is expired, try to refresh it
      if (graphResponse.status === 401) {
        console.log('Token expired, attempting refresh...')
        try {
          const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-microsoft-token', {
            body: { user_id }
          })
          
          if (refreshError || refreshData?.error) {
            console.error('Token refresh failed:', refreshError || refreshData?.error)
            return new Response(
              JSON.stringify({ error: 'Microsoft account authentication expired. Please reconnect your account.' }),
              { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }

          // Retry with new token
          const retryResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/calendar/events?$filter=start/dateTime ge '${filterDate}'&$orderby=start/dateTime&$top=50&$expand=attachments&$select=id,subject,body,bodyPreview,start,end,location,onlineMeeting,attendees,isAllDay,importance,sensitivity,showAs,responseStatus,organizer,webLink`,
            {
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
                'Content-Type': 'application/json',
                'Prefer': 'outlook.timezone="UTC"'
              }
            }
          )

          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text()
            console.error('Retry failed:', retryErrorText)
            return new Response(
              JSON.stringify({ error: 'Failed to fetch meetings from Outlook after token refresh' }),
              { 
                status: retryResponse.status, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }

          const retryData = await retryResponse.json()
          return await processMeetings(retryData, user_id, supabase)
        } catch (refreshError) {
          console.error('Refresh attempt failed:', refreshError)
          return new Response(
            JSON.stringify({ error: 'Failed to refresh Microsoft token' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meetings from Outlook' }),
        { 
          status: graphResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const graphData = await graphResponse.json()
    return await processMeetings(graphData, user_id, supabase)

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processMeetings(graphData: any, user_id: string, supabase: any) {
  console.log(`Found ${graphData.value?.length || 0} meetings from Outlook`)

  // Get existing meetings from our database
  const { data: existingMeetings } = await supabase
    .from('meetings')
    .select('outlook_event_id, id, title')
    .eq('created_by', user_id)

  const existingEventIds = new Set(
    existingMeetings?.map((m: any) => m.outlook_event_id).filter(Boolean) || []
  )

  let syncedCount = 0
  let skippedCount = 0

  // Process each meeting from Outlook
  for (const event of graphData.value || []) {
    try {
      // Skip if we already have this meeting
      if (existingEventIds.has(event.id)) {
        skippedCount++
        console.log(`Skipping existing meeting: ${event.subject}`)
        continue
      }

      // Skip all-day events or events without proper time data
      if (event.isAllDay || !event.start?.dateTime || !event.end?.dateTime) {
        skippedCount++
        console.log(`Skipping all-day or invalid time event: ${event.subject}`)
        continue
      }

      // Skip if the event is in the past
      const startTime = new Date(event.start.dateTime)
      if (startTime < new Date()) {
        skippedCount++
        console.log(`Skipping past event: ${event.subject}`)
        continue
      }

      // Determine meeting type based on online meeting info
      const meetingType = event.onlineMeeting?.joinUrl ? 'online' : 'physical'
      
      console.log(`Processing meeting: ${event.subject}`)
      
      // Create meeting in our database
      const { error: insertError } = await supabase
        .from('meetings')
        .insert({
          title: event.subject || 'Untitled Meeting',
          description: event.bodyPreview || event.body?.content || null,
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          location: event.location?.displayName || null,
          meeting_type: meetingType,
          status: 'scheduled',
          created_by: user_id,
          outlook_event_id: event.id,
          teams_join_url: event.onlineMeeting?.joinUrl || null,
          teams_meeting_id: event.onlineMeeting?.conferenceId || null
        })

      if (insertError) {
        console.error('Error inserting meeting:', insertError)
      } else {
        syncedCount++
        console.log(`Successfully synced meeting: ${event.subject}`)
      }
    } catch (error) {
      console.error('Error processing meeting:', error)
    }
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      syncedCount, 
      skippedCount,
      totalFound: graphData.value?.length || 0
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}
