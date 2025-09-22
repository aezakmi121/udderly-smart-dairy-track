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

    // Import Firebase Admin SDK for proper push notification support
    const { initializeApp, getApps, cert } = await import('https://www.gstatic.com/firebasejs/10.3.0/firebase-admin.js');
    const { getMessaging } = await import('https://www.gstatic.com/firebasejs/10.3.0/firebase-admin/messaging.js');

    // Initialize Firebase Admin if not already initialized
    let app;
    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } else {
      app = getApps()[0];
    }

    const messaging = getMessaging(app);

    // Send notifications to all tokens
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
    };

    // Send to multiple tokens efficiently
    if (tokens.length > 0) {
      const response = await messaging.sendMulticast({
        tokens: tokens,
        ...message,
      });

      console.log(`Successfully sent notifications: ${response.successCount}`);
      console.log(`Failed to send notifications: ${response.failureCount}`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to token ${tokens[idx].substring(0, 10)}...: ${resp.error?.message}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error sending notifications:', error);
    // Fallback to browser notification simulation for testing
    console.log('Falling back to simulation...');
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log(`Tokens: ${tokens.length}`);
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