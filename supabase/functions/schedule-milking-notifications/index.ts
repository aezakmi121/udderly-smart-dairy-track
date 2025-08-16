import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get milking session settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('*');
    
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }
    
    const morningStartTime = settings.find(s => s.key === 'morning_session_start')?.value;
    const morningEndTime = settings.find(s => s.key === 'morning_session_end')?.value;
    const eveningStartTime = settings.find(s => s.key === 'evening_session_start')?.value;
    const eveningEndTime = settings.find(s => s.key === 'evening_session_end')?.value;
    
    const collectionStartTime = settings.find(s => s.key === 'collection_start_time')?.value;
    const collectionEndTime = settings.find(s => s.key === 'collection_end_time')?.value;
    
    // Get users with push notification tokens
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, fcm_token')
      .not('fcm_token', 'is', null);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    const tokens = profiles.map(p => p.fcm_token).filter(Boolean);
    
    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No FCM tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    let notificationSent = false;
    
    // Check for milking session start times
    if (morningStartTime && currentTime === morningStartTime) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title: 'Morning Milking Session',
          body: 'Time to start the morning milking session!',
          data: { type: 'milking_start', session: 'morning' }
        }
      });
      notificationSent = true;
    }
    
    if (eveningStartTime && currentTime === eveningStartTime) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title: 'Evening Milking Session',
          body: 'Time to start the evening milking session!',
          data: { type: 'milking_start', session: 'evening' }
        }
      });
      notificationSent = true;
    }
    
    // Check for milking session end times
    if (morningEndTime && currentTime === morningEndTime) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title: 'Morning Milking Complete',
          body: 'Morning milking session should be completed.',
          data: { type: 'milking_end', session: 'morning' }
        }
      });
      notificationSent = true;
    }
    
    if (eveningEndTime && currentTime === eveningEndTime) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title: 'Evening Milking Complete',
          body: 'Evening milking session should be completed.',
          data: { type: 'milking_end', session: 'evening' }
        }
      });
      notificationSent = true;
    }
    
    // Check for milk collection times
    if (collectionStartTime && currentTime === collectionStartTime) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title: 'Milk Collection Started',
          body: 'Milk collection period has begun.',
          data: { type: 'collection_start' }
        }
      });
      notificationSent = true;
    }
    
    if (collectionEndTime && currentTime === collectionEndTime) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title: 'Milk Collection Ending',
          body: 'Milk collection period is ending soon.',
          data: { type: 'collection_end' }
        }
      });
      notificationSent = true;
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: notificationSent ? 'Notifications sent' : 'No notifications scheduled for this time',
        currentTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in schedule-milking-notifications function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to schedule notifications',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});