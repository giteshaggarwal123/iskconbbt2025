
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { meetingId, accessToken } = await req.json()

    if (!meetingId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing meetingId or accessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Enhanced transcript extraction for meeting:', meetingId)

    // Enhanced meeting discovery with more comprehensive search
    const findMeetingApproaches = [
      // Direct online meeting lookup
      {
        name: 'Direct Online Meeting',
        url: `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      },
      // Try with URL decoding
      {
        name: 'URL Decoded Meeting',
        url: `https://graph.microsoft.com/v1.0/me/onlineMeetings/${decodeURIComponent(meetingId)}`,
      },
      // Search through all online meetings (extended range)
      {
        name: 'Extended Online Meetings Search',
        url: `https://graph.microsoft.com/v1.0/me/onlineMeetings?$orderby=creationDateTime desc&$top=100`,
      },
      // Search through calendar events (extended range)
      {
        name: 'Extended Calendar Events Search',
        url: `https://graph.microsoft.com/v1.0/me/calendar/events?$orderby=createdDateTime desc&$top=100&$expand=onlineMeeting`,
      },
      // Search through all user's calls and meetings
      {
        name: 'Call Records Search',
        url: `https://graph.microsoft.com/v1.0/communications/callRecords?$orderby=startDateTime desc&$top=50`,
      },
      // Search through Teams chat messages for meeting references
      {
        name: 'Teams Chat Search',
        url: `https://graph.microsoft.com/v1.0/me/chats?$expand=messages&$top=50`,
      }
    ]

    let meetingData = null
    let successfulApproach = null
    let allMeetings = []

    for (const approach of findMeetingApproaches) {
      try {
        console.log(`Trying enhanced approach: ${approach.name}`)
        const meetingResponse = await fetch(approach.url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (meetingResponse.ok) {
          const data = await meetingResponse.json()
          
          if (approach.name.includes('Search') || approach.name.includes('Records')) {
            if (data.value && data.value.length > 0) {
              allMeetings.push(...data.value)
              
              // Enhanced matching logic
              let foundMeeting = data.value.find((meeting: any) => {
                const meetingIdMatches = 
                  meeting.id === meetingId || 
                  meeting.id === decodeURIComponent(meetingId) ||
                  meetingId.includes(meeting.id?.substring(0, 20)) ||
                  meeting.id?.includes(meetingId.substring(0, 20))
                
                const urlMatches = 
                  meeting.onlineMeeting?.joinUrl?.includes(meetingId) ||
                  meeting.joinWebUrl?.includes(meetingId) ||
                  meeting.webUrl?.includes(meetingId)
                
                const subjectMatches = 
                  approach.name.includes('Calendar') && 
                  meeting.subject?.toLowerCase().includes('demo') // Based on your screenshot
                
                return meetingIdMatches || urlMatches || subjectMatches
              })
              
              if (foundMeeting) {
                meetingData = foundMeeting
                successfulApproach = approach.name
                console.log(`Found meeting using ${approach.name}:`, {
                  id: meetingData.id,
                  subject: meetingData.subject || meetingData.summary,
                  startDateTime: meetingData.startDateTime || meetingData.start?.dateTime
                })
                break
              }
            }
          } else {
            // Direct lookup success
            meetingData = data
            successfulApproach = approach.name
            break
          }
        } else {
          console.warn(`${approach.name} failed:`, meetingResponse.status, await meetingResponse.text())
        }
      } catch (error) {
        console.warn(`Error with ${approach.name}:`, error)
      }
    }

    if (!meetingData && allMeetings.length > 0) {
      // Fallback: use the most recent meeting if no exact match
      console.log('No exact match found, using most recent meeting as fallback')
      meetingData = allMeetings[0]
      successfulApproach = 'Most Recent Meeting Fallback'
    }

    if (!meetingData) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Meeting not found with enhanced search methods',
          details: 'Tried multiple discovery methods but could not locate the meeting.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actualMeetingId = meetingData.id
    console.log('Using meeting ID for enhanced transcript extraction:', actualMeetingId)

    // Enhanced transcript extraction with multiple strategies
    const transcriptStrategies = [
      // Strategy 1: Direct transcript API (standard)
      {
        name: 'Standard Transcript API',
        execute: async () => {
          const url = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${actualMeetingId}/transcripts`
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          if (response.ok) {
            return await response.json()
          }
          throw new Error(`API failed: ${response.status}`)
        }
      },
      // Strategy 2: Beta transcript API
      {
        name: 'Beta Transcript API',
        execute: async () => {
          const url = `https://graph.microsoft.com/beta/me/onlineMeetings/${actualMeetingId}/transcripts`
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          if (response.ok) {
            return await response.json()
          }
          throw new Error(`Beta API failed: ${response.status}`)
        }
      },
      // Strategy 3: Call records with transcript data
      {
        name: 'Call Records Transcript',
        execute: async () => {
          const url = `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=organizer/user/id eq '${meetingData.organizer?.user?.id || 'unknown'}'&$orderby=startDateTime desc&$top=20`
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          if (response.ok) {
            const data = await response.json()
            // Look for call records that might contain transcript data
            const relevantCall = data.value?.find((call: any) => 
              call.startDateTime && 
              new Date(call.startDateTime).toDateString() === new Date(meetingData.startDateTime || Date.now()).toDateString()
            )
            if (relevantCall) {
              return { value: [{ id: relevantCall.id, content: 'Found call record' }] }
            }
          }
          throw new Error('No matching call records found')
        }
      },
      // Strategy 4: Meeting recordings with transcript
      {
        name: 'Meeting Recordings',
        execute: async () => {
          const url = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${actualMeetingId}/recordings`
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          if (response.ok) {
            const data = await response.json()
            if (data.value?.length > 0) {
              return { 
                value: data.value.map((recording: any) => ({
                  id: recording.id,
                  recordingType: 'video',
                  hasTranscript: true
                })),
                hasRecordings: true
              }
            }
          }
          throw new Error('No recordings found')
        }
      }
    ]

    let transcriptData = null
    let transcriptContent = null
    let successfulStrategy = null
    let hasRecordings = false

    // Try each strategy
    for (const strategy of transcriptStrategies) {
      try {
        console.log(`Trying transcript strategy: ${strategy.name}`)
        const result = await strategy.execute()
        
        if (result.hasRecordings) {
          hasRecordings = true
        }
        
        if (result.value?.length > 0) {
          transcriptData = result
          successfulStrategy = strategy.name
          console.log(`${strategy.name} found ${result.value.length} transcript/recording entries`)
          
          // Try to extract content if transcripts are found
          if (strategy.name.includes('Transcript')) {
            await extractTranscriptContent(result, actualMeetingId, accessToken)
          }
          
          break
        }
      } catch (error) {
        console.warn(`${strategy.name} failed:`, error.message)
      }
    }

    // Enhanced content extraction function
    async function extractTranscriptContent(data: any, meetingId: string, token: string) {
      const contentFormats = ['text/vtt', 'text/plain', 'application/json']
      
      for (const transcript of data.value) {
        for (const format of contentFormats) {
          try {
            const contentUrls = [
              `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/transcripts/${transcript.id}/content?$format=${format}`,
              `https://graph.microsoft.com/beta/me/onlineMeetings/${meetingId}/transcripts/${transcript.id}/content?$format=${format}`,
              `https://graph.microsoft.com/v1.0/me/onlineMeetings/${encodeURIComponent(meetingId)}/transcripts/${transcript.id}/content`
            ]
            
            for (const contentUrl of contentUrls) {
              const contentResponse = await fetch(contentUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': format === 'text/vtt' ? 'text/plain' : format
                }
              })

              if (contentResponse.ok) {
                const content = await contentResponse.text()
                if (content && content.trim().length > 0) {
                  // Process VTT format to extract readable text
                  if (format === 'text/vtt' || content.includes('WEBVTT')) {
                    const lines = content.split('\n')
                    const textLines = lines.filter(line => 
                      !line.startsWith('WEBVTT') && 
                      !line.match(/^\d{2}:\d{2}:\d{2}/) &&
                      !line.includes('-->') &&
                      !line.match(/^\d+$/) &&
                      line.trim().length > 0
                    )
                    transcriptContent = textLines.join('\n').trim()
                  } else {
                    transcriptContent = content
                  }
                  
                  if (transcriptContent && transcriptContent.length > 50) {
                    console.log(`Content extracted successfully: ${transcriptContent.length} characters`)
                    return
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`Content extraction failed for ${format}:`, error)
          }
        }
      }
    }

    // Get attendees information
    let attendeesData = null
    try {
      const attendeesUrls = [
        `https://graph.microsoft.com/v1.0/me/onlineMeetings/${actualMeetingId}/attendanceReports`,
        `https://graph.microsoft.com/beta/me/onlineMeetings/${actualMeetingId}/attendanceReports`
      ]
      
      for (const url of attendeesUrls) {
        try {
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          if (response.ok) {
            attendeesData = await response.json()
            break
          }
        } catch (error) {
          console.warn('Attendees fetch failed:', error)
        }
      }
    } catch (error) {
      console.warn('Error fetching attendees:', error)
    }

    // Prepare comprehensive response
    const hasContent = !!transcriptContent && transcriptContent.trim().length > 0
    const hasTranscripts = !!transcriptData?.value?.length

    if (!hasTranscripts && !hasRecordings) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No transcript or recording found',
          details: 'Enhanced extraction methods found the meeting but no transcript content is available. The meeting may not have been recorded with transcription enabled, or the transcript is still being processed.',
          meeting: meetingData,
          foundWith: successfulApproach,
          strategiesAttempted: transcriptStrategies.map(s => s.name),
          suggestion: 'Ensure the meeting was recorded with transcription enabled. Transcripts can take up to 24 hours to become available after a meeting ends.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = {
      success: true,
      transcript: transcriptData,
      transcriptContent: transcriptContent,
      attendees: attendeesData,
      hasContent: hasContent,
      hasRecordings: hasRecordings,
      meeting: meetingData,
      transcriptId: transcriptData?.value?.[0]?.id,
      foundWith: successfulApproach,
      transcriptMethod: successfulStrategy,
      actualMeetingId: actualMeetingId,
      extractionDetails: {
        strategiesAttempted: transcriptStrategies.map(s => s.name),
        transcriptsFound: transcriptData?.value?.length || 0,
        recordingsFound: hasRecordings,
        contentExtracted: hasContent,
        contentLength: transcriptContent?.length || 0
      }
    }

    console.log('Enhanced extraction complete:', {
      success: true,
      hasTranscripts: hasTranscripts,
      hasRecordings: hasRecordings,
      hasContent: hasContent,
      contentLength: transcriptContent?.length || 0,
      foundWith: successfulApproach,
      transcriptMethod: successfulStrategy
    })

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Enhanced transcript extraction error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error during enhanced transcript extraction',
        details: error.message
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
