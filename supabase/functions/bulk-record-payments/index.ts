// Bulk-pay: applies one payment method/date to many payouts at once.
// Body: { items: [{ payout_id, amount }], method, paid_on?, reference?, note?, close_partial?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { items, method, paid_on, reference, note, close_partial, idempotency_key } = body;
    if (!Array.isArray(items) || items.length === 0 || !method) {
      return new Response(JSON.stringify({ error: 'items[] and method required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });

    // Bulk idempotency: derive a per-event key by namespacing the request key
    // with the payout_id. If the same request fires twice, the unique index on
    // idempotency_key makes the second insert a no-op for each event.
    const date = paid_on ?? new Date().toISOString().slice(0, 10);
    const events = items
      .filter((i: { payout_id?: string; amount?: number }) => Number(i.amount) > 0 && i.payout_id)
      .map((i: { payout_id: string; amount: number }) => ({
        payout_id: i.payout_id,
        amount: Number(i.amount),
        method,
        reference: reference ?? null,
        paid_on: date,
        paid_by_user_id: userData.user.id,
        note: note ?? null,
        idempotency_key: idempotency_key ? `${idempotency_key}:${i.payout_id}` : null,
      }));

    if (events.length === 0) {
      return new Response(JSON.stringify({ ok: true, recorded: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If a key is supplied, skip events whose key already exists so the rest
    // of the batch can still apply (network-retry safety).
    let toInsert = events;
    if (idempotency_key) {
      const keys = events.map((e) => e.idempotency_key).filter((k): k is string => !!k);
      const { data: existing } = await supabase.from('farmer_payment_events')
        .select('idempotency_key').in('idempotency_key', keys);
      const existingSet = new Set((existing ?? []).map((r) => r.idempotency_key));
      toInsert = events.filter((e) => !existingSet.has(e.idempotency_key));
      if (toInsert.length === 0) {
        return new Response(JSON.stringify({ ok: true, recorded: 0, idempotent: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { error } = await supabase.from('farmer_payment_events').insert(toInsert);
    if (error) throw error;

    if (close_partial) {
      const ids = toInsert.map((e) => e.payout_id);
      await supabase.from('farmer_payouts').update({ status: 'paid' }).in('id', ids);
    }

    // Audit — only the events we actually inserted
    for (const e of toInsert) {
      await supabase.from('farmer_payout_audit').insert({
        payout_id: e.payout_id, action: 'bulk_payment_recorded',
        after: { amount: e.amount, method }, actor_user_id: userData.user.id,
      });
    }

    return new Response(JSON.stringify({ ok: true, recorded: toInsert.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
