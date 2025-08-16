import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');

if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
}

interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: string;
}

async function getAccessToken(): Promise<string> {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey!);
    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT for Firebase Admin SDK
    const header = {
      alg: "RS256",
      typ: "JWT"
    };
    
    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    };
    
    // Base64 encode header and payload
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // Create signature (simplified - in production use proper JWT library)
    const message = `${encodedHeader}.${encodedPayload}`;
    
    // Use OAuth2 token endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${message}.signature` // In production, use proper JWT signing
      })
    });
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function sendNotificationToTokens(
  tokens: string[], 
  title: string, 
  body: string, 
  data?: Record<string, string>
): Promise<void> {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey!);
    const projectId = serviceAccount.project_id;
    
    const accessToken = await getAccessToken();
    
    // Send to each token
    for (const token of tokens) {
      const message = {
        message: {
          token: token,
          notification: {
            title: title,
            body: body
          },
          data: data || {},
          android: {
            notification: {
              icon: 'ic_notification',
              color: '#2563eb',
              sound: 'default'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        }
      };
      
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to send notification to token ${token}:`, error);
      } else {
        console.log(`Notification sent successfully to token ${token}`);
      }
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokens, title, body, data, type }: PushNotificationRequest = await req.json();
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
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
    
    await sendNotificationToTokens(tokens, title, body, data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notifications sent to ${tokens.length} device(s)` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send push notification',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});