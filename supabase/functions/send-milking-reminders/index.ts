import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Returns HH:MM string for current time in the given IANA timezone
function getCurrentTimeInZone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(now); // "HH:MM"
}

// Returns true if |currentTime - targetTime| <= windowMinutes
function isWithinWindow(currentHHMM: string, targetHHMM: string, windowMinutes = 5): boolean {
  const [ch, cm] = currentHHMM.split(':').map(Number);
  const [th, tm] = targetHHMM.split(':').map(Number);
  const currentMinutes = ch * 60 + cm;
  const targetMinutes = th * 60 + tm;
  return Math.abs(currentMinutes - targetMinutes) <= windowMinutes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Read milking session settings
    const { data: sessionRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'milking_session_settings')
      .single();

    const sessionSettings = sessionRow?.value || {
      auto: true,
      timezone: 'Asia/Kolkata',
      morning: { start: '05:00', end: '06:30' },
      evening: { start: '17:00', end: '18:30' },
    };

    // Read alert configuration to check the milking_session_reminders toggle
    const { data: alertRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'alert_configuration')
      .single();

    const alertConfig = alertRow?.value || { milking_session_reminders: true };

    if (alertConfig.milking_session_reminders === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: 'milking_session_reminders disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timezone = sessionSettings.timezone || 'Asia/Kolkata';
    const currentTime = getCurrentTimeInZone(timezone);
    const morningStart: string = sessionSettings.morning?.start || '05:00';
    const eveningStart: string = sessionSettings.evening?.start || '17:00';

    const notifications: { session: string; title: string; body: string }[] = [];

    if (isWithinWindow(currentTime, morningStart)) {
      notifications.push({
        session: 'morning',
        title: '🌅 Morning Milking Session',
        body: `Morning milking starts at ${morningStart}. Time to begin!`,
      });
    }

    if (isWithinWindow(currentTime, eveningStart)) {
      notifications.push({
        session: 'evening',
        title: '🌇 Evening Milking Session',
        body: `Evening milking starts at ${eveningStart}. Time to begin!`,
      });
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, currentTime, timezone }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;
    for (const notif of notifications) {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          headings: { en: notif.title },
          contents: { en: notif.body },
          included_segments: ['Subscribed Users'],
          data: { type: 'milking_reminder', session: notif.session },
        }),
      });

      if (response.ok) {
        sent++;
      } else {
        const err = await response.json();
        console.error(`Failed to send ${notif.session} reminder:`, err);
      }
    }

    // Log to notification_history for all admin users
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const historyRows = admins.flatMap((admin: any) =>
        notifications.map((notif) => ({
          user_id: admin.user_id,
          notification_id: crypto.randomUUID(),
          title: notif.title,
          message: notif.body,
          type: 'milking_reminder',
          priority: 'medium',
          status: sent > 0 ? 'sent' : 'failed',
        }))
      );
      await supabase.from('notification_history').insert(historyRows);
    }

    return new Response(
      JSON.stringify({ success: true, sent, notifications: notifications.map((n) => n.session), currentTime, timezone }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('send-milking-reminders error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
