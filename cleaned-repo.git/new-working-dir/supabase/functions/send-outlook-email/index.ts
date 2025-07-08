
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { subject, body, recipients, attachments = [], meetingId = null } = await req.json()

    console.log('Sending email with details:', { subject, recipients: recipients.length, meetingId })

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

    // Check if token needs refresh
    let accessToken = profile.microsoft_access_token
    if (new Date(profile.token_expires_at) <= new Date()) {
      console.log('Token expired, would refresh here')
    }

    // Process attachments if provided
    let emailAttachments = []
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          // If it's a meeting attachment, get from storage
          if (meetingId && attachment.file_path) {
            const { data: fileData } = await supabase.storage
              .from('meeting-attachments')
              .download(attachment.file_path)
            
            if (fileData) {
              const arrayBuffer = await fileData.arrayBuffer()
              const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
              
              emailAttachments.push({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: attachment.name,
                contentType: attachment.mime_type,
                contentBytes: base64Content
              })
            }
          } else if (attachment.contentBytes) {
            // Direct attachment with base64 content
            emailAttachments.push({
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: attachment.name,
              contentType: attachment.contentType || 'application/octet-stream',
              contentBytes: attachment.contentBytes
            })
          }
        } catch (error) {
          console.error('Error processing attachment:', attachment.name, error)
          // Continue with other attachments even if one fails
        }
      }
    }

    // Prepare email data
    const emailData = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: recipients.map((email: string) => ({
          emailAddress: {
            address: email.trim()
          }
        })),
        attachments: emailAttachments,
        importance: 'normal'
      },
      saveToSentItems: true
    }

    console.log('Sending email via Microsoft Graph with', recipients.length, 'recipients')

    // Send email via Microsoft Graph
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Microsoft Graph error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email sent successfully via Microsoft Graph')

    // Log email in database
    const { error: logError } = await supabase
      .from('emails')
      .insert({
        subject,
        body,
        recipients,
        sender_id: user.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        meeting_id: meetingId
      })

    if (logError) {
      console.error('Failed to log email:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        attachmentCount: emailAttachments.length,
        recipientCount: recipients.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
