import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
  priority?: 'default' | 'normal' | 'high';
}

interface PushNotificationRequest {
  userId?: string;
  userIds?: string[];
  tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function sendExpoPushNotification(
  messages: ExpoPushMessage[]
): Promise<{ success: number; failed: number; errors: any[] }> {
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  
  if (!expoAccessToken) {
    throw new Error('EXPO_ACCESS_TOKEN is not set');
  }

  console.log(`📤 Sending ${messages.length} Expo push notifications...`);

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Expo API request failed: ${response.status} ${errorText}`);
      throw new Error(`Expo API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Expo push response:', JSON.stringify(result, null, 2));

    // Count successes and failures
    const data = Array.isArray(result.data) ? result.data : [result.data];
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    data.forEach((item: any) => {
      if (item.status === 'ok') {
        success++;
      } else {
        failed++;
        errors.push(item);
        console.error(`❌ Failed to send notification:`, item);
      }
    });

    console.log(`✅ Expo Results: ${success} successful, ${failed} failed`);
    return { success, failed, errors };

  } catch (error) {
    console.error('❌ Error sending Expo push notifications:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userIds, tokens, title, body, data, sound, badge }: PushNotificationRequest = await req.json();
    
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let expoPushTokens: string[] = [];

    // Get tokens from database if userId or userIds provided
    if (userId || userIds) {
      const ids = userId ? [userId] : userIds!;
      console.log(`🔍 Fetching Expo push tokens for ${ids.length} user(s)...`);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .in('id', ids);

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }

      expoPushTokens = profiles
        ?.map(p => p.expo_push_token)
        .filter((token): token is string => !!token) || [];
      
      console.log(`📱 Found ${expoPushTokens.length} Expo push tokens from database`);
    }

    // Add directly provided tokens
    if (tokens && tokens.length > 0) {
      expoPushTokens = [...expoPushTokens, ...tokens];
      console.log(`📱 Total ${expoPushTokens.length} Expo push tokens (including provided tokens)`);
    }

    if (expoPushTokens.length === 0) {
      console.log('⚠️ No Expo push tokens found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0,
          message: 'No Expo push tokens found for the specified users'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare Expo push messages
    const messages: ExpoPushMessage[] = expoPushTokens.map(token => ({
      to: token,
      title,
      body,
      data: data || {},
      sound: sound !== undefined ? sound : 'default',
      badge: badge,
      priority: 'high',
    }));

    const result = await sendExpoPushNotification(messages);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: result.success,
        failed: result.failed,
        message: `Sent ${result.success} notifications, ${result.failed} failed`,
        errors: result.errors.length > 0 ? result.errors : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in expo-push function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send Expo push notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
