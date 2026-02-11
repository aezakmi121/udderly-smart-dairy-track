import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get alert configuration
    const { data: configRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'alert_configuration')
      .single();

    const config = configRow?.value || {
      pd_check_days: 60,
      expected_delivery_days: 283,
      vaccination_reminder_days: 3,
      low_stock_threshold: true,
      categories: { reminders: true, alerts: true, updates: true }
    };

    const today = new Date().toISOString().split('T')[0];
    const alerts: { title: string; body: string; type: string; userId?: string }[] = [];

    // 1. PD checks due (AI done X days ago, PD not done)
    if (config.categories?.reminders !== false) {
      const pdCheckDate = new Date();
      pdCheckDate.setDate(pdCheckDate.getDate() - (config.pd_check_days || 60));
      const pdDateStr = pdCheckDate.toISOString().split('T')[0];

      const { data: pdDue } = await supabase
        .from('ai_records')
        .select('id, cow_id, ai_date, cows:cow_id(cow_number)')
        .eq('pd_done', false)
        .lte('ai_date', pdDateStr)
        .is('pd_result', null);

      if (pdDue && pdDue.length > 0) {
        const cowNumbers = pdDue.map((r: any) => r.cows?.cow_number).filter(Boolean).join(', ');
        alerts.push({
          title: `PD Check Due - ${pdDue.length} cow(s)`,
          body: `PD check needed for: ${cowNumbers || pdDue.length + ' cows'}`,
          type: 'pd_check_due',
        });
      }

      // 2. Expected deliveries approaching (within 7 days)
      const deliveryStart = new Date();
      const deliveryEnd = new Date();
      deliveryEnd.setDate(deliveryEnd.getDate() + 7);

      const { data: deliveriesDue } = await supabase
        .from('ai_records')
        .select('id, cow_id, expected_delivery_date, cows:cow_id(cow_number)')
        .gte('expected_delivery_date', today)
        .lte('expected_delivery_date', deliveryEnd.toISOString().split('T')[0])
        .is('actual_delivery_date', null)
        .eq('pd_result', 'positive');

      if (deliveriesDue && deliveriesDue.length > 0) {
        deliveriesDue.forEach((record: any) => {
          alerts.push({
            title: `Delivery Expected Soon`,
            body: `Cow ${record.cows?.cow_number || 'Unknown'} expected to deliver by ${record.expected_delivery_date}`,
            type: 'delivery_due',
          });
        });
      }
    }

    // 3. Low feed stock
    if (config.low_stock_threshold !== false && config.categories?.alerts !== false) {
      const { data: lowStock } = await supabase
        .from('feed_items')
        .select('name, current_stock, minimum_stock_level, unit')
        .not('minimum_stock_level', 'is', null)
        .filter('current_stock', 'lte', 'minimum_stock_level');

      // Manual filter since Supabase doesn't support column-to-column comparison in filter
      const actualLowStock = lowStock?.filter(item => 
        item.current_stock !== null && 
        item.minimum_stock_level !== null && 
        item.current_stock <= item.minimum_stock_level
      );

      if (actualLowStock && actualLowStock.length > 0) {
        const items = actualLowStock.map(i => `${i.name} (${i.current_stock}/${i.minimum_stock_level} ${i.unit})`).join(', ');
        alerts.push({
          title: `Low Feed Stock Alert - ${actualLowStock.length} item(s)`,
          body: `Low stock: ${items}`,
          type: 'low_stock',
        });
      }
    }

    // Send notifications via OneSignal (broadcast to all subscribed users)
    let sent = 0;
    if (alerts.length > 0 && ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY) {
      for (const alert of alerts) {
        try {
          const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              headings: { en: alert.title },
              contents: { en: alert.body },
              included_segments: ['Subscribed Users'],
              data: { type: alert.type, date: today },
            }),
          });

          if (response.ok) {
            sent++;
          } else {
            const err = await response.json();
            console.error('OneSignal send failed:', err);
          }
        } catch (e) {
          console.error('Error sending alert:', e);
        }
      }
    }

    // Log all alerts to notification_history for admin users
    if (alerts.length > 0) {
      const { data: adminProfiles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminProfiles) {
        const historyRows = [];
        for (const admin of adminProfiles) {
          for (const alert of alerts) {
            historyRows.push({
              user_id: admin.user_id,
              notification_id: crypto.randomUUID(),
              title: alert.title,
              message: alert.body,
              type: alert.type,
              priority: 'high',
              status: 'sent',
            });
          }
        }
        if (historyRows.length > 0) {
          await supabase.from('notification_history').insert(historyRows);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsFound: alerts.length, 
        notificationsSent: sent,
        alerts: alerts.map(a => ({ title: a.title, type: a.type }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check alerts error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
