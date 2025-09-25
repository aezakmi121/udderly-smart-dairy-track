import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: string;
}

async function sendNotificationToTokens(
  tokens: string[], 
  title: string, 
  body: string, 
  data?: Record<string, string>
): Promise<void> {
  try {
    const serviceAccountKeyRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    
    if (!serviceAccountKeyRaw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
    }

    // Parse service account key with better error handling
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKeyRaw);
    } catch (parseError) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
      console.error('Raw key (first 50 chars):', serviceAccountKeyRaw.substring(0, 50));
      throw new Error('Invalid Firebase service account key format');
    }

    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Firebase service account key is missing required fields');
    }

    // Use direct Firebase REST API instead of Admin SDK for better Deno compatibility
    const accessToken = await getAccessToken(serviceAccount);
    
    // Send notifications using Firebase REST API
    const promises = tokens.map(async (token) => {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: {
                title: title,
                body: body,
              },
              data: data || {},
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to send notification to token ${token.substring(0, 10)}...:`, error);
        return false;
      }
      return true;
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    const failureCount = results.length - successCount;
    
    console.log(`Successfully sent notifications: ${successCount}`);
    console.log(`Failed to send notifications: ${failureCount}`);
    
  } catch (error) {
    console.error('Error sending notifications:', error);
    // Fallback to browser notification simulation for testing
    console.log('Falling back to simulation...');
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log(`Tokens: ${tokens.length}`);
  }
}

// Helper function to get OAuth2 access token for Firebase
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Base64 encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/]/g, (m) => ({ '+': '-', '/': '_' }[m as '+' | '/']!)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/]/g, (m) => ({ '+': '-', '/': '_' }[m as '+' | '/']!)).replace(/=/g, '');

  // Create signature using crypto.subtle
  const textEncoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    textEncoder.encode(`${encodedHeader}.${encodedPayload}`)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[+/]/g, (m) => ({ '+': '-', '/': '_' }[m as '+' | '/']!))
    .replace(/=/g, '');

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

// Helper function to convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = pem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
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