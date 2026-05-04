import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function postNotification(payload: any, restKey: string) {
  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${restKey}`,
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
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

    const { title, body, data, userId, segment, includeExternalUserIds } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const basePayload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      data: data || {},
    };

    const targetIds: string[] =
      includeExternalUserIds?.length > 0 ? includeExternalUserIds :
      userId ? [userId] :
      [];

    let result: any = null;
    let response: { ok: boolean; status: number; json: any } | null = null;
    let strategy = 'segment';

    if (targetIds.length > 0) {
      // Primary: target by external_id alias
      strategy = 'alias';
      const aliasPayload = {
        ...basePayload,
        include_aliases: { external_id: targetIds },
        target_channel: 'push',
      };
      response = await postNotification(aliasPayload, ONESIGNAL_REST_API_KEY);
      result = response.json;

      const recipients = Number(result?.recipients ?? 0);
      // Fallback: if alias matched 0 subscriptions, try direct subscription IDs
      // from profiles.onesignal_player_id
      if (response.ok && recipients === 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .in('id', targetIds);

        const subIds = (profiles || [])
          .map((p: any) => p.onesignal_player_id)
          .filter((id: string | null) => !!id && !id.startsWith('ext:'));

        if (subIds.length > 0) {
          strategy = 'subscription_ids_fallback';
          const subPayload = {
            ...basePayload,
            include_subscription_ids: subIds,
            target_channel: 'push',
          };
          response = await postNotification(subPayload, ONESIGNAL_REST_API_KEY);
          result = response.json;
          console.log('Alias matched 0 — fell back to subscription IDs', { subIds, recipients: result?.recipients });
        }
      }
    } else {
      const segPayload = {
        ...basePayload,
        included_segments: segment ? [segment] : ['Subscribed Users'],
      };
      response = await postNotification(segPayload, ONESIGNAL_REST_API_KEY);
      result = response.json;
    }

    if (!response || !response.ok) {
      console.error('OneSignal API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: result, strategy }),
        { status: response?.status ?? 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to notification_history
    try {
      if (userId) {
        await supabase.from('notification_history').insert({
          user_id: userId,
          notification_id: result.id || crypto.randomUUID(),
          title,
          message: body,
          type: data?.type || 'push',
          priority: data?.priority || 'medium',
          status: 'sent',
        });
      }
    } catch (logError) {
      console.error('Failed to log notification:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id, recipients: result.recipients, strategy }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
