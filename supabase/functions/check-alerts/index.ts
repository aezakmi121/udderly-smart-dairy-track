import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AlertType = 'pd_check' | 'delivery' | 'vaccination' | 'low_stock' | 'all';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    // Determine which check(s) to run — supports manual trigger from settings UI
    let runType: AlertType = 'all';
    try {
      const url = new URL(req.url);
      const qp = url.searchParams.get('type') as AlertType | null;
      if (qp) runType = qp;
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        if (body?.type) runType = body.type as AlertType;
      }
    } catch (_) { /* ignore */ }

    console.log(`[check-alerts] Running type=${runType}`);

    // Load alert configuration
    const { data: configRow } = await supabase
      .from('app_settings').select('value').eq('key', 'alert_configuration').maybeSingle();

    const config = configRow?.value || {
      pd_check_days: 60,
      expected_delivery_days: 283,
      vaccination_reminder_days: 3,
      low_stock_threshold: true,
      categories: { reminders: true, alerts: true, updates: true }
    };

    const { data: pdSetting } = await supabase
      .from('app_settings').select('value').eq('key', 'pd_alert_days').maybeSingle();
    const { data: deliverySetting } = await supabase
      .from('app_settings').select('value').eq('key', 'delivery_expected_days').maybeSingle();

    const pdCheckDays = (typeof pdSetting?.value === 'number' ? pdSetting.value : null) || config.pd_check_days || 60;
    const expectedDeliveryDays = (typeof deliverySetting?.value === 'number' ? deliverySetting.value : null) || config.expected_delivery_days || 283;
    const vaccinationReminderDays = config.vaccination_reminder_days || 3;

    const today = new Date().toISOString().split('T')[0];
    const alerts: { title: string; body: string; type: string }[] = [];

    // Get target users (admin + worker)
    const { data: targetUsers } = await supabase
      .from('user_roles').select('user_id').in('role', ['admin', 'worker']);
    const userIds = Array.from(new Set((targetUsers || []).map((u: any) => u.user_id))).filter(Boolean);
    console.log(`[check-alerts] Target users: ${userIds.length}`);

    const remindersOn = config.categories?.reminders !== false;
    const alertsOn = config.categories?.alerts !== false;

    // ---------- 1. PD overdue (grouped alert with all cows + days overdue) ----------
    if ((runType === 'all' || runType === 'pd_check') && remindersOn) {
      const pdCutoff = new Date();
      pdCutoff.setDate(pdCutoff.getDate() - pdCheckDays);
      const pdCutoffStr = pdCutoff.toISOString().split('T')[0];

      const { data: pdDue, error: pdErr } = await supabase
        .from('ai_records')
        .select('id, cow_id, ai_date, service_number, cow:cows!ai_records_cow_id_fkey(cow_number)')
        .eq('pd_done', false)
        .is('pd_result', null)
        .is('actual_delivery_date', null)
        .lte('ai_date', pdCutoffStr);

      if (pdErr) console.error('[check-alerts] PD query error:', pdErr);

      // Skip records where the same cow has a NEWER AI record (this one is superseded)
      let filtered: any[] = [];
      if (pdDue && pdDue.length > 0) {
        const cowIds = Array.from(new Set(pdDue.map((r: any) => r.cow_id).filter(Boolean)));
        const { data: latestPerCow } = await supabase
          .from('ai_records')
          .select('cow_id, ai_date')
          .in('cow_id', cowIds)
          .order('ai_date', { ascending: false });
        const latestMap = new Map<string, string>();
        (latestPerCow || []).forEach((r: any) => {
          if (!latestMap.has(r.cow_id)) latestMap.set(r.cow_id, r.ai_date);
        });
        filtered = pdDue.filter((r: any) => latestMap.get(r.cow_id) === r.ai_date);
      }
      console.log(`[check-alerts] PD overdue records: ${pdDue?.length || 0}, after newer-AI filter: ${filtered.length}`);

      if (filtered.length > 0) {
        // Build grouped summary: "Cow 45 (82d), Cow 6 (47d)"
        const items = filtered
          .map((rec: any) => {
            const daysSinceAI = Math.floor((Date.now() - new Date(rec.ai_date).getTime()) / 86400000);
            const daysOverdue = daysSinceAI - pdCheckDays;
            return { cow: rec.cow?.cow_number || '?', daysOverdue };
          })
          .sort((a, b) => b.daysOverdue - a.daysOverdue);
        const summary = items.map(i => `Cow ${i.cow} (${i.daysOverdue}d overdue)`).join(', ');
        alerts.push({
          title: `🩺 PD Overdue — ${items.length} cow(s)`,
          body: `Please get PD checked: ${summary}`,
          type: 'pd_check_due',
        });
      }
    }

    // ---------- 2. Delivery approaching (next 7 days) — grouped ----------
    if ((runType === 'all' || runType === 'delivery') && remindersOn) {
      const deliveryEnd = new Date();
      deliveryEnd.setDate(deliveryEnd.getDate() + 7);
      const { data: deliveriesDue, error: dErr } = await supabase
        .from('ai_records')
        .select('id, cow_id, expected_delivery_date, cow:cows!ai_records_cow_id_fkey(cow_number)')
        .gte('expected_delivery_date', today)
        .lte('expected_delivery_date', deliveryEnd.toISOString().split('T')[0])
        .is('actual_delivery_date', null)
        .eq('pd_result', 'positive');
      if (dErr) console.error('[check-alerts] Delivery query error:', dErr);
      console.log(`[check-alerts] Delivery approaching: ${deliveriesDue?.length || 0}`);

      if (deliveriesDue && deliveriesDue.length > 0) {
        const items = (deliveriesDue as any[])
          .map((r) => ({
            cow: r.cow?.cow_number || '?',
            days: Math.ceil((new Date(r.expected_delivery_date).getTime() - Date.now()) / 86400000),
            date: r.expected_delivery_date,
          }))
          .sort((a, b) => a.days - b.days);
        const summary = items.map(i => `Cow ${i.cow} in ${i.days}d (${i.date})`).join(', ');
        alerts.push({
          title: `🐄 Delivery Expected — ${items.length} cow(s)`,
          body: `Upcoming deliveries: ${summary}`,
          type: 'delivery_due',
        });
      }
    }

    // ---------- 3. Vaccination due ----------
    if ((runType === 'all' || runType === 'vaccination') && remindersOn) {
      const vEnd = new Date();
      vEnd.setDate(vEnd.getDate() + vaccinationReminderDays);
      const { data: vacDue, error: vErr } = await supabase
        .from('vaccination_records')
        .select('id, cow_id, next_due_date, cow:cows!vaccination_records_cow_id_fkey(cow_number)')
        .gte('next_due_date', today)
        .lte('next_due_date', vEnd.toISOString().split('T')[0]);
      if (vErr) console.error('[check-alerts] Vaccination query error:', vErr);
      console.log(`[check-alerts] Vaccinations due: ${vacDue?.length || 0}`);

      if (vacDue && vacDue.length > 0) {
        const cowNumbers = vacDue.map((r: any) => r.cow?.cow_number).filter(Boolean).join(', ');
        alerts.push({
          title: `💉 Vaccination Due — ${vacDue.length} cow(s)`,
          body: `Within ${vaccinationReminderDays} days: ${cowNumbers || vacDue.length + ' cows'}`,
          type: 'vaccination_due',
        });
      }
    }

    // ---------- 4. Low feed stock ----------
    if ((runType === 'all' || runType === 'low_stock') && config.low_stock_threshold !== false && alertsOn) {
      const { data: lowStock } = await supabase
        .from('feed_items')
        .select('name, current_stock, minimum_stock_level, unit')
        .not('minimum_stock_level', 'is', null);
      const actualLowStock = (lowStock || []).filter((i: any) =>
        i.current_stock !== null && i.minimum_stock_level !== null && i.current_stock <= i.minimum_stock_level
      );
      console.log(`[check-alerts] Low-stock items: ${actualLowStock.length}`);
      if (actualLowStock.length > 0) {
        const items = actualLowStock.map((i: any) => `${i.name} (${i.current_stock}/${i.minimum_stock_level} ${i.unit})`).join(', ');
        alerts.push({
          title: `📦 Low Feed Stock — ${actualLowStock.length} item(s)`,
          body: `Low stock: ${items}`,
          type: 'low_stock',
        });
      }
    }

    // ---------- Send via OneSignal ----------
    let sent = 0;
    if (alerts.length > 0 && ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY && userIds.length > 0) {
      for (const alert of alerts) {
        try {
          const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              headings: { en: alert.title },
              contents: { en: alert.body },
              include_external_user_ids: userIds,
              channel_for_external_user_ids: "push",
              data: { type: alert.type, date: today },
            }),
          });
          if (response.ok) {
            sent++;
            console.log(`[check-alerts] ✅ ${alert.title}`);
          } else {
            console.error('[check-alerts] OneSignal failed:', await response.text());
          }
        } catch (e) {
          console.error('[check-alerts] Send error:', e);
        }
      }
    }

    // ---------- Log to notification_history ----------
    if (alerts.length > 0 && userIds.length > 0) {
      const rows = userIds.flatMap((uid) =>
        alerts.map((a) => ({
          user_id: uid,
          notification_id: crypto.randomUUID(),
          title: a.title,
          message: a.body,
          type: a.type,
          priority: 'high',
          status: sent > 0 ? 'sent' : 'failed',
        }))
      );
      if (rows.length > 0) await supabase.from('notification_history').insert(rows);
    }

    return new Response(
      JSON.stringify({
        success: true,
        runType,
        alertsFound: alerts.length,
        notificationsSent: sent,
        targetUsers: userIds.length,
        config: { pdCheckDays, expectedDeliveryDays, vaccinationReminderDays },
        alerts: alerts.map(a => ({ title: a.title, type: a.type })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[check-alerts] Fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
