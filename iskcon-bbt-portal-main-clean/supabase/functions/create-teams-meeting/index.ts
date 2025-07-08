// @ts-expect-error Deno runtime import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Check for required env vars
  // @ts-expect-error Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-expect-error Deno global
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase environment variables not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // @ts-expect-error Deno dynamic import
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { title, description, startTime, endTime, attendees = [] } = await req.json()

    console.log('Creating Teams meeting for user:', user.email)
    console.log('Meeting details:', { title, description, startTime, endTime, attendees })

    // Get user's Microsoft tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('microsoft_access_token, microsoft_refresh_token, token_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.microsoft_access_token) {
      console.error('Microsoft account not connected:', profileError)
      return new Response(
        JSON.stringify({ error: 'Microsoft account not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let accessToken = profile.microsoft_access_token

    // Check if token needs refresh
    if (new Date(profile.token_expires_at) <= new Date()) {
      console.log('Token expired, attempting refresh...')
      
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-microsoft-token', {
        body: { user_id: user.id }
      })

      if (refreshError || refreshData.error) {
        console.error('Token refresh failed:', refreshError || refreshData.error)
        return new Response(
          JSON.stringify({ error: 'Microsoft token expired. Please reconnect your account.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      accessToken = refreshData.access_token
    }

    // Create Teams meeting with enhanced calendar integration
    const meetingData = {
      startDateTime: startTime,
      endDateTime: endTime,
      subject: title,
      chatInfo: {
        "@odata.type": "#microsoft.graph.chatInfo"
      },
      lobbyBypassSettings: {
        scope: "everyone",
        isDialInBypassEnabled: true
      },
      allowMeetingChat: "enabled",
      allowTeamworkReactions: true,
      allowedPresenters: "everyone",
      isEntryExitAnnounced: false,
      allowAttendeeToEnableMic: true,
      allowAttendeeToEnableCamera: true
    }

    console.log('Creating Teams meeting with data:', meetingData)

    const teamsResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(meetingData)
    })

    if (!teamsResponse.ok) {
      const errorData = await teamsResponse.json()
      console.error('Teams meeting error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to create Teams meeting', details: errorData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const teamsData = await teamsResponse.json()
    console.log('Teams meeting created successfully:', teamsData.id)

    // Create comprehensive Outlook calendar event with attendees
    const calendarEventData = {
      subject: title,
      body: {
        contentType: 'HTML',
        content: `
          <div>
            <p>${description || 'No description provided'}</p>
            <hr>
            <p><strong>Join Microsoft Teams Meeting</strong></p>
            <p><a href="${teamsData.joinWebUrl}" style="color: #0078d4; text-decoration: none;">Click here to join the meeting</a></p>
            <br>
            <p><strong>Meeting ID:</strong> ${teamsData.videoTeleconferenceId || 'N/A'}</p>
            <p><strong>Conference ID:</strong> ${teamsData.audioConferencing?.conferenceId || 'N/A'}</p>
            ${teamsData.audioConferencing?.tollNumber ? `<p><strong>Phone:</strong> ${teamsData.audioConferencing.tollNumber}</p>` : ''}
          </div>
        `
      },
      start: {
        dateTime: startTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endTime,
        timeZone: 'UTC'
      },
      location: {
        displayName: 'Microsoft Teams Meeting',
        locationType: 'default'
      },
      attendees: attendees.map((email: string) => ({
        emailAddress: {
          address: email.trim(),
          name: email.trim()
        },
        type: 'required'
      })),
      onlineMeeting: {
        joinUrl: teamsData.joinWebUrl
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
      allowNewTimeProposals: true,
      responseRequested: true,
      importance: 'normal',
      sensitivity: 'normal',
      showAs: 'busy',
      categories: ['Meeting', 'Teams'],
      reminderMinutesBeforeStart: 15
    }

    console.log('Creating Outlook calendar event with attendees:', attendees)

    const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(calendarEventData)
    })

    let outlookEventId = null
    let calendarEventDetails: any = null

    if (calendarResponse.ok) {
      calendarEventDetails = await calendarResponse.json()
      outlookEventId = calendarEventDetails.id
      console.log('Calendar event created successfully:', outlookEventId)
      
      // Automatically send calendar invitations if attendees are specified
      if (attendees && attendees.length > 0 && calendarEventDetails) {
        console.log('Sending calendar invitations to attendees:', attendees)
        try {
          const inviteResponse = await fetch(`https://graph.microsoft.com/v1.0/me/events/${outlookEventId}/calendar/events/${outlookEventId}/forward`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              toRecipients: attendees.map((email: string) => ({
                emailAddress: {
                  address: email.trim(),
                  name: email.trim()
                }
              })),
              comment: `You're invited to join our Teams meeting: ${title}`
            })
          })
          
          if (inviteResponse.ok) {
            console.log('Calendar invitations sent successfully')
          } else {
            console.error('Failed to send calendar invitations:', await inviteResponse.text())
          }
        } catch (inviteError) {
          console.error('Error sending calendar invitations:', inviteError)
        }
      }
    } else {
      const calendarError = await calendarResponse.json()
      console.error('Calendar event creation failed:', calendarError)
    }

    // Store meeting in database with enhanced metadata
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        meeting_type: 'online',
        location: 'Microsoft Teams Meeting',
        teams_meeting_id: teamsData.id,
        teams_join_url: teamsData.joinWebUrl,
        outlook_event_id: outlookEventId,
        created_by: user.id,
        status: 'scheduled'
      })
      .select()
      .single()

    if (meetingError) {
      console.error('Failed to store meeting:', meetingError)
      return new Response(
        JSON.stringify({ error: 'Failed to store meeting', details: meetingError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Meeting stored in database successfully')

    // Send additional email invitations via send-outlook-email function
    if (attendees && attendees.length > 0 && meeting) {
      console.log('Sending additional email invitations via send-outlook-email function')
      try {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb; margin-bottom: 20px;">Meeting Invitation</h2>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">${title}</h3>
              
              <div style="margin-bottom: 10px;">
                <strong>📅 Date:</strong> ${new Date(startTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              
              <div style="margin-bottom: 10px;">
                <strong>🕒 Time:</strong> ${new Date(startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })} - ${new Date(endTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
              
              <div style="margin-bottom: 10px;">
                <strong>📍 Location:</strong> Microsoft Teams Meeting
              </div>
              
              <div style="margin-bottom: 15px;">
                <strong>💻 Join Online:</strong> 
                <a href="${teamsData.joinWebUrl}" style="color: #2563eb; text-decoration: none;">Click to join Teams meeting</a>
              </div>
              
              ${description ? `
                <div style="margin-top: 15px;">
                  <strong>📋 Description:</strong>
                  <p style="margin: 5px 0 0 0; color: #64748b;">${description}</p>
                </div>
              ` : ''}
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              Please mark your calendar and let us know if you cannot attend.
            </p>
            
            <hr style="border: none; height: 1px; background-color: #e2e8f0; margin: 20px 0;">
            
            <p style="color: #94a3b8; font-size: 12px;">
              This invitation was sent automatically by the meeting management system.
            </p>
          </div>
        `

        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-outlook-email', {
          body: {
            subject: `Meeting Invitation: ${title}`,
            body: emailBody,
            recipients: attendees,
            meetingId: meeting.id
          }
        })

        if (emailError) {
          console.error('Error sending email invitations:', emailError)
        } else {
          console.log('Email invitations sent successfully:', emailData)
        }
      } catch (emailError) {
        console.error('Error sending email invitations:', emailError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        meeting: meeting,
        teamsJoinUrl: teamsData.joinWebUrl,
        outlookEventId: outlookEventId,
        meetingId: teamsData.id,
        videoTeleconferenceId: teamsData.videoTeleconferenceId,
        audioConferencing: teamsData.audioConferencing,
        calendarEventUrl: calendarEventDetails?.webLink || null,
        attendeesNotified: attendees.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create meeting error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
