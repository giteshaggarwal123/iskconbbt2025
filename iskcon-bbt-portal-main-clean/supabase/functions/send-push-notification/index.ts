
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

    const { 
      userId, 
      title, 
      body, 
      data = {},
      userIds = [] // For bulk notifications
    } = await req.json()

    console.log('Sending push notification:', { userId, userIds, title, body, data })

    // Get push tokens for specified users
    let query = supabaseClient
      .from('profiles')
      .select('id, push_token, first_name, last_name')
      .not('push_token', 'is', null)

    if (userId) {
      query = query.eq('id', userId)
    } else if (userIds && userIds.length > 0) {
      query = query.in('id', userIds)
    }

    const { data: profiles, error: profilesError } = await query

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users with push tokens found')
      return new Response(
        JSON.stringify({ success: true, message: 'No push tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${profiles.length} users with push tokens`)

    // Prepare FCM notifications
    const notifications = profiles.map(profile => ({
      to: profile.push_token,
      notification: {
        title: title,
        body: body,
        icon: '/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png',
        badge: '/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png',
        click_action: 'FCM_PLUGIN_ACTIVITY',
        sound: 'default'
      },
      data: {
        ...data,
        userId: profile.id
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_launcher',
          color: '#dc2626',
          sound: 'default',
          default_sound: true,
          channel_id: 'iskcon-bureau-notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: title,
              body: body
            },
            badge: 1,
            sound: 'default'
          }
        }
      }
    }))

    // Send notifications using FCM (you would need to integrate with your FCM service)
    const fcmApiKey = Deno.env.get('FCM_SERVER_KEY')
    
    if (!fcmApiKey) {
      console.log('FCM_SERVER_KEY not configured, logging notifications instead')
      notifications.forEach((notification, index) => {
        console.log(`Notification ${index + 1}:`, {
          to: notification.to.substring(0, 20) + '...',
          title: notification.notification.title,
          body: notification.notification.body,
          data: notification.data
        })
      })
      
      return new Response(
        JSON.stringify({
          success: true,
          sent: notifications.length,
          message: 'Notifications logged (FCM not configured)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send actual FCM notifications
    const fcmPromises = notifications.map(async (notification) => {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notification)
        })

        const result = await response.json()
        
        if (!response.ok) {
          console.error('FCM Error:', result)
          return { success: false, error: result }
        }

        return { success: true, messageId: result.message_id }
      } catch (error) {
        console.error('Error sending FCM notification:', error)
        return { success: false, error: error.message }
      }
    })

    const results = await Promise.all(fcmPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`Push notification summary: ${successful} successful, ${failed} failed`)

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
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
