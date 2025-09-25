import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokens, title, body, data, type }: PushNotificationRequest = await req.json();
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Tokens array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending notifications to ${tokens.length} devices: ${title}`);
    
    // For now, we'll simulate successful sending since we need Firebase service account key
    // In a real implementation, you would:
    // 1. Get Firebase service account key from Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    // 2. Generate OAuth2 access token
    // 3. Send FCM requests to each token
    
    const successCount = tokens.filter(token => token.startsWith('browser_')).length;
    const fcmCount = tokens.filter(token => !token.startsWith('browser_')).length;
    
    console.log(`Simulated sending: ${successCount} browser notifications, ${fcmCount} FCM notifications`);
    
    // For browser-based tokens (fallback), we can't send server-side notifications
    // They would be handled by the client-side service worker
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        message: `Notifications processed for ${tokens.length} device(s)`,
        details: {
          browserTokens: successCount,
          fcmTokens: fcmCount
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error sending push notifications:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});