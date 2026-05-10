import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getCurrentInZone(timezone: string): { hhmm: string; ymd: string } {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return { hhmm: time, ymd: date };
}

function isWithinWindow(currentHHMM: string, targetHHMM: string, windowMinutes = 2): boolean {
  const [ch, cm] = currentHHMM.split(':').map(Number);
  const [th, tm] = targetHHMM.split(':').map(Number);
  return Math.abs((ch * 60 + cm) - (th * 60 + tm)) <= windowMinutes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: sessionRow } = await supabase
      .from('app_settings').select('value').eq('key', 'milking_session_settings').single();
    const sessionSettings = sessionRow?.value || {
      timezone: 'Asia/Kolkata',
      morning: { start: '05:00' },
      evening: { start: '17:00' },
    };

    const { data: alertRow } = await supabase
      .from('app_settings').select('value').eq('key', 'alert_configuration').single();
    const alertConfig = alertRow?.value || { milking_session_reminders: true };

    if (alertConfig.milking_session_reminders === false) {
      return new Response(JSON.stringify({ success: true, skipped: 'disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const timezone = sessionSettings.timezone || 'Asia/Kolkata';
    const { hhmm: currentTime, ymd: today } = getCurrentInZone(timezone);
    const morningStart: string = sessionSettings.morning?.start || '05:00';
    const eveningStart: string = sessionSettings.evening?.start || '17:00';

    const candidates: { session: 'morning' | 'evening'; title: string; body: string; tag: string }[] = [];
    if (isWithinWindow(currentTime, morningStart)) {
      candidates.push({
        session: 'morning',
        title: '🌅 Morning Milking Session',
        body: `Morning milking starts at ${morningStart}. Time to begin!`,
        tag: `milking_morning_${today}`,
      });
    }
    if (isWithinWindow(currentTime, eveningStart)) {
      candidates.push({
        session: 'evening',
        title: '🌇 Evening Milking Session',
        body: `Evening milking starts at ${eveningStart}. Time to begin!`,
        tag: `milking_evening_${today}`,
      });
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, currentTime, timezone }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Idempotency guard: skip if a dispatch for this tag was already logged today
    const notifications: typeof candidates = [];
    for (const c of candidates) {
      const { data: existing } = await supabase
        .from('notification_events')
        .select('id')
        .eq('payload_tag', c.tag)
        .eq('event_type', 'dispatch_ok')
        .limit(1)
        .maybeSingle();
      if (existing) {
        console.log(`[milking-reminders] skip duplicate tag=${c.tag}`);
        await supabase.from('notification_events').insert({
          event_type: 'dispatch_skipped_duplicate',
          payload_tag: c.tag,
          source: 'send-milking-reminders',
          status: 'skipped',
        });
        continue;
      }
      notifications.push(c);
    }

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, deduped: true, currentTime }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: targetUsers } = await supabase
      .from('user_roles').select('user_id').in('role', ['admin', 'worker']);
    const userIds = Array.from(new Set((targetUsers || []).map((u: any) => u.user_id)));

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, noUsers: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let sent = 0;
    for (const notif of notifications) {
      const { data: resp, error } = await supabase.functions.invoke('send-web-push', {
        body: {
          title: notif.title,
          body: notif.body,
          userIds,
          data: { type: 'milking_reminder', session: notif.session, tag: notif.tag },
        },
      });
      const ok = !error && (resp?.sent ?? 0) > 0;
      await supabase.from('notification_events').insert({
        event_type: ok ? 'dispatch_ok' : 'dispatch_fail',
        payload_tag: notif.tag,
        source: 'send-milking-reminders',
        status: ok ? 'sent' : 'failed',
        meta: { recipients: resp?.sent ?? 0, error: error?.message ?? null, userCount: userIds.length },
      });
      if (ok) sent++;
    }

    return new Response(
      JSON.stringify({ success: true, sent, currentTime, timezone, dispatched: notifications.map(n => n.tag) }),
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
