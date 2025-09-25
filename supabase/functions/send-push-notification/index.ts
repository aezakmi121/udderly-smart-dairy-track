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

// Helper function to get OAuth2 access token for FCM
async function getAccessToken(): Promise<string> {
  const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKey) {
    throw new Error('Firebase service account key not found');
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  
  // Create JWT for Google OAuth2
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // Clean up the private key
  const privateKeyPem = serviceAccount.private_key
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // Convert PEM to binary
  const privateKeyBinary = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
  
  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBinary,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Create JWT
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(jwtHeader))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(jwtPayload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(unsignedToken)
  );
  
  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token request failed:', errorText);
    throw new Error(`Token request failed: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Helper function to send FCM notification
async function sendFCMNotification(token: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY') || '{}');
    
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    
    const message = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body,
        },
        data: data || {},
        webpush: {
          headers: {
            Urgency: 'high'
          },
          notification: {
            title: title,
            body: body,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            requireInteraction: true,
            actions: []
          }
        }
      }
    };

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FCM request failed for token ${token.substring(0, 20)}...: ${response.status} ${errorText}`);
      return false;
    }

    console.log(`Successfully sent FCM notification to token ${token.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error(`Error sending FCM notification to token ${token.substring(0, 20)}...:`, error);
    return false;
  }
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
    
    // Separate browser tokens from FCM tokens
    const browserTokens = tokens.filter(token => token.startsWith('browser_'));
    const fcmTokens = tokens.filter(token => !token.startsWith('browser_'));
    
    let successfulSends = 0;
    let failedSends = 0;

    // Send FCM notifications
    if (fcmTokens.length > 0) {
      console.log(`Sending ${fcmTokens.length} FCM notifications...`);
      for (const token of fcmTokens) {
        const success = await sendFCMNotification(token, title, body, data);
        if (success) {
          successfulSends++;
        } else {
          failedSends++;
        }
      }
    }

    // Browser tokens can't be sent from server-side, they're handled by client service worker
    if (browserTokens.length > 0) {
      console.log(`${browserTokens.length} browser tokens found - these are handled client-side`);
    }
    
    console.log(`FCM Results: ${successfulSends} successful, ${failedSends} failed`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successfulSends,
        failed: failedSends,
        message: `Sent ${successfulSends} notifications, ${failedSends} failed`,
        details: {
          browserTokens: browserTokens.length,
          fcmTokens: fcmTokens.length,
          successfulSends,
          failedSends
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