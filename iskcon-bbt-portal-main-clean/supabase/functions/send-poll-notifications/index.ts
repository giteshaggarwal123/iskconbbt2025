
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { pollId, notificationType } = await req.json()

    console.log('Sending poll notifications for:', { pollId, notificationType })

    // Get poll details
    const { data: poll, error: pollError } = await supabaseClient
      .from('polls')
      .select('title, description, deadline, notify_members')
      .eq('id', pollId)
      .single()

    if (pollError) {
      console.error('Error fetching poll:', pollError)
      throw pollError
    }

    if (!poll.notify_members) {
      console.log('Notifications disabled for this poll')
      return new Response(
        JSON.stringify({ success: true, message: 'Notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all users who should receive notifications (all profiles)
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email, first_name, last_name')
      .not('email', 'is', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles.length} users to notify`)

    // Check which users haven't received this notification type yet
    const { data: existingNotifications, error: notifError } = await supabaseClient
      .from('poll_notifications')
      .select('user_id')
      .eq('poll_id', pollId)
      .eq('notification_type', notificationType)

    if (notifError) {
      console.error('Error fetching existing notifications:', notifError)
      throw notifError
    }

    const notifiedUserIds = new Set(existingNotifications.map(n => n.user_id))
    const usersToNotify = profiles.filter(profile => !notifiedUserIds.has(profile.id))

    console.log(`Sending notifications to ${usersToNotify.length} users`)

    // Send email notifications (placeholder - you can integrate with your email service)
    const emailPromises = usersToNotify.map(async (profile) => {
      try {
        // Here you would integrate with your email service (SendGrid, Resend, etc.)
        console.log(`Would send email to ${profile.email} about poll: ${poll.title}`)
        
        // For now, just log the notification
        const emailContent = generateEmailContent(poll, profile, notificationType)
        console.log('Email content:', emailContent)

        // Record that we sent the notification
        await supabaseClient
          .from('poll_notifications')
          .insert({
            poll_id: pollId,
            user_id: profile.id,
            notification_type: notificationType
          })

        return { success: true, email: profile.email }
      } catch (error) {
        console.error(`Failed to send notification to ${profile.email}:`, error)
        return { success: false, email: profile.email, error: error.message }
      }
    })

    const results = await Promise.all(emailPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`Notification summary: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-poll-notifications function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function generateEmailContent(poll: any, profile: any, notificationType: string) {
  const userName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile.email
  const deadline = new Date(poll.deadline).toLocaleString()
  
  const subjects = {
    initial: `New Poll: ${poll.title}`,
    reminder_1: `Reminder: Please vote on ${poll.title}`,
    reminder_2: `Second Reminder: Vote needed for ${poll.title}`,
    final: `Final Reminder: Poll closing soon - ${poll.title}`
  }

  const bodies = {
    initial: `Dear ${userName},\n\nA new poll has been created: "${poll.title}"\n\n${poll.description || ''}\n\nDeadline: ${deadline}\n\nPlease log in to cast your vote.\n\nBest regards,\nISKCON Bureau`,
    reminder_1: `Dear ${userName},\n\nThis is a reminder to vote on the poll: "${poll.title}"\n\nDeadline: ${deadline}\n\nPlease log in to cast your vote if you haven't already.\n\nBest regards,\nISKCON Bureau`,
    reminder_2: `Dear ${userName},\n\nSecond reminder: Please vote on "${poll.title}"\n\nDeadline: ${deadline}\n\nYour participation is important. Please log in to cast your vote.\n\nBest regards,\nISKCON Bureau`,
    final: `Dear ${userName},\n\nFinal reminder: The poll "${poll.title}" is closing soon!\n\nDeadline: ${deadline}\n\nThis is your last chance to vote. Please log in immediately.\n\nBest regards,\nISKCON Bureau`
  }

  return {
    to: profile.email,
    subject: subjects[notificationType as keyof typeof subjects],
    body: bodies[notificationType as keyof typeof bodies]
  }
}
