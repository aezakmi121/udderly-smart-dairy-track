import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { JWT } from 'npm:google-auth-library@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Notification {
  id: string
  user_id: string
  body: string
  title?: string
}

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: Notification
  schema: 'public'
}

interface PushNotificationRequest {
  userId?: string
  userIds?: string[]
  tokens?: string[]
  title: string
  body: string
  data?: Record<string, any>
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const getAccessToken = ({
  clientEmail,
  privateKey,
}: {
  clientEmail: string
  privateKey: string
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err)
        return
      }
      resolve(tokens!.access_token!)
    })
  })
}

async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set')
    }

    const serviceAccount = JSON.parse(serviceAccountKey)
    const accessToken = await getAccessToken({
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    })

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: {
              title,
              body,
            },
            data: data || {},
            webpush: {
              headers: {
                Urgency: 'high'
              },
              notification: {
                title,
                body,
                icon: '/android-chrome-192x192.png',
                badge: '/favicon-32x32.png',
                requireInteraction: true,
              }
            }
          },
        }),
      }
    )

    const resData = await res.json()
    
    if (res.status < 200 || res.status > 299) {
      console.error('FCM error:', resData)
      return { success: false, error: resData.error?.message || 'Failed to send notification' }
    }

    console.log('✅ FCM notification sent successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    // Handle webhook payload from database trigger
    if (payload.type === 'INSERT' && payload.table === 'notifications') {
      const webhookPayload = payload as WebhookPayload
      
      console.log('📥 Received webhook for notification:', webhookPayload.record.id)
      
      // Get user's FCM token
      const { data } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('id', webhookPayload.record.user_id)
        .single()

      if (!data?.fcm_token) {
        console.log('⚠️ No FCM token found for user')
        return new Response(
          JSON.stringify({ success: false, message: 'No FCM token found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const result = await sendFCMNotification(
        data.fcm_token,
        webhookPayload.record.title || 'Notification from Supabase',
        webhookPayload.record.body
      )

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Handle manual push notification request
    const { userId, userIds, tokens, title, body, data }: PushNotificationRequest = payload
    
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let fcmTokens: string[] = []

    // Get tokens from database if userId or userIds provided
    if (userId || userIds) {
      const ids = userId ? [userId] : userIds!
      console.log(`🔍 Fetching FCM tokens for ${ids.length} user(s)...`)

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('fcm_token')
        .in('id', ids)

      if (error) {
        console.error('Error fetching profiles:', error)
        throw error
      }

      fcmTokens = profiles
        ?.map(p => p.fcm_token)
        .filter((token): token is string => !!token) || []
      
      console.log(`📱 Found ${fcmTokens.length} FCM tokens from database`)
    }

    // Add directly provided tokens
    if (tokens && tokens.length > 0) {
      fcmTokens = [...fcmTokens, ...tokens]
      console.log(`📱 Total ${fcmTokens.length} FCM tokens`)
    }

    if (fcmTokens.length === 0) {
      console.log('⚠️ No FCM tokens found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0,
          message: 'No FCM tokens found for the specified users'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send to all tokens
    const results = await Promise.all(
      fcmTokens.map(token => sendFCMNotification(token, title, body, data))
    )

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful,
        failed: failed,
        message: `Sent ${successful} notifications, ${failed} failed`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in push notification function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send push notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
