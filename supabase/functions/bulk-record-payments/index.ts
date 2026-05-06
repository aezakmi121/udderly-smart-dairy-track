// Bulk-pay: applies one payment method/date to many payouts at once.
// Body: { items: [{ payout_id, amount }], method, paid_on?, reference?, note?, close_partial?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { items, method, paid_on, reference, note, close_partial } = body;
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

    const date = paid_on ?? new Date().toISOString().slice(0, 10);
    const events = items
      .filter((i: any) => Number(i.amount) > 0 && i.payout_id)
      .map((i: any) => ({
        payout_id: i.payout_id,
        amount: Number(i.amount),
        method,
        reference: reference ?? null,
        paid_on: date,
        paid_by_user_id: userData.user.id,
        note: note ?? null,
      }));

    if (events.length === 0) {
      return new Response(JSON.stringify({ ok: true, recorded: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase.from('farmer_payment_events').insert(events);
    if (error) throw error;

    if (close_partial) {
      const ids = events.map((e) => e.payout_id);
      await supabase.from('farmer_payouts').update({ status: 'paid' }).in('id', ids);
    }

    // Audit
    for (const e of events) {
      await supabase.from('farmer_payout_audit').insert({
        payout_id: e.payout_id, action: 'bulk_payment_recorded',
        after: { amount: e.amount, method }, actor_user_id: userData.user.id,
      });
    }

    return new Response(JSON.stringify({ ok: true, recorded: events.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
