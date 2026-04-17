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
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(JSON.stringify({ error: 'OneSignal not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, body, data } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title and body required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Target admins + workers
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'worker']);

    const userIds = [...new Set((roles || []).map((r: any) => r.user_id))];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, recipients: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: body },
        data: data || {},
        include_external_user_ids: userIds,
        channel_for_external_user_ids: 'push',
      }),
    });
    const result = await resp.json();

    // Log per-user
    try {
      const notifId = result.id || crypto.randomUUID();
      const rows = userIds.map((uid) => ({
        user_id: uid,
        notification_id: notifId,
        title,
        message: body,
        type: data?.type || 'plant_sale',
        priority: data?.priority || 'medium',
        status: 'sent',
        entity_id: data?.saleId || null,
        entity_type: 'plant_sale',
      }));
      await supabase.from('notification_history').insert(rows);
    } catch (e) {
      console.error('history log failed', e);
    }

    return new Response(JSON.stringify({ success: true, id: result.id, recipients: userIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-plant-sale error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
