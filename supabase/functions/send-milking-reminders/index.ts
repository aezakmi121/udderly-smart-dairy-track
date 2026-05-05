import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getCurrentTimeInZone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(now);
}

function isWithinWindow(currentHHMM: string, targetHHMM: string, windowMinutes = 5): boolean {
  const [ch, cm] = currentHHMM.split(':').map(Number);
  const [th, tm] = targetHHMM.split(':').map(Number);
  return Math.abs((ch * 60 + cm) - (th * 60 + tm)) <= windowMinutes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: sessionRow } = await supabase
      .from('app_settings').select('value').eq('key', 'milking_session_settings').single();
    const sessionSettings = sessionRow?.value || {
      auto: true,
      timezone: 'Asia/Kolkata',
      morning: { start: '05:00', end: '06:30' },
      evening: { start: '17:00', end: '18:30' },
    };

    const { data: alertRow } = await supabase
      .from('app_settings').select('value').eq('key', 'alert_configuration').single();
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
      notifications.push({ session: 'morning', title: '🌅 Morning Milking Session', body: `Morning milking starts at ${morningStart}. Time to begin!` });
    }
    if (isWithinWindow(currentTime, eveningStart)) {
      notifications.push({ session: 'evening', title: '🌇 Evening Milking Session', body: `Evening milking starts at ${eveningStart}. Time to begin!` });
    }

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, currentTime, timezone }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetUsers } = await supabase
      .from('user_roles').select('user_id').in('role', ['admin', 'worker']);
    const userIds = Array.from(new Set((targetUsers || []).map((u: any) => u.user_id)));

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, noUsers: true, currentTime, timezone }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    for (const notif of notifications) {
      const { data: resp, error } = await supabase.functions.invoke('send-web-push', {
        body: {
          title: notif.title,
          body: notif.body,
          userIds,
          data: { type: 'milking_reminder', session: notif.session },
        },
      });
      if (!error && (resp?.sent ?? 0) > 0) {
        sent++;
        console.log(`✅ Sent ${notif.session} reminder to ${resp.sent} device(s)`);
      } else if (error) {
        console.error(`Failed to send ${notif.session} reminder:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, targetUsers: userIds.length, currentTime, timezone }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('send-milking-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
