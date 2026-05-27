import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";

// Records a payment event and (optionally) closes a partial bill (carry-forward to next cycle).
// Body: { payout_id, amount, method, reference?, paid_on?, note?, close_partial?: boolean }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { payout_id, amount, method, reference, paid_on, note, close_partial, idempotency_key } = body;
    if (!payout_id || amount == null || !method) {
      return new Response(JSON.stringify({ error: 'payout_id, amount, method required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userData.user.id);
    const allowed = (roles ?? []).some((r) => r.role === 'admin' || r.role === 'farmer');
    if (!allowed) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });

    // Idempotency: if this key was already used, return the existing state
    // instead of re-inserting. Network retries from the client are safe.
    if (idempotency_key) {
      const { data: existing } = await supabase.from('farmer_payment_events')
        .select('id').eq('idempotency_key', idempotency_key).maybeSingle();
      if (existing) {
        const { data: payoutNow } = await supabase.from('farmer_payouts')
          .select('cycle_id, farmer_id, paid_amount, net_payable, unpaid_balance, status')
          .eq('id', payout_id).single();
        return new Response(JSON.stringify({ ok: true, payout: payoutNow, idempotent: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (Number(amount) > 0) {
      const { error } = await supabase.from('farmer_payment_events').insert({
        payout_id, amount: Number(amount), method, reference,
        paid_on: paid_on ?? new Date().toISOString().slice(0, 10),
        paid_by_user_id: userData.user.id, note,
        idempotency_key: idempotency_key ?? null,
      });
      if (error) throw error;
    }

    // close_partial: trigger already updated status to 'paid' if total >= net.
    // For partial, status stays as-is until admin presses close_partial which marks it paid + leaves unpaid_balance for next cycle.
    if (close_partial) {
      await supabase.from('farmer_payouts').update({ status: 'paid' }).eq('id', payout_id);
    }

    // Audit
    const { data: payoutAfter } = await supabase.from('farmer_payouts')
      .select('cycle_id, farmer_id, paid_amount, net_payable, unpaid_balance, status')
      .eq('id', payout_id).single();
    await supabase.from('farmer_payout_audit').insert({
      payout_id, cycle_id: payoutAfter?.cycle_id,
      action: 'payment_recorded', after: payoutAfter, actor_user_id: userData.user.id,
    });

    // WhatsApp confirmation (best-effort)
    if (payoutAfter?.farmer_id) {
      const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'payout_settings').maybeSingle();
      const sendOn = (settings?.value as any)?.send_whatsapp_on_payment ?? true;
      if (sendOn) {
        const { data: f } = await supabase.from('farmers').select('name, phone_number').eq('id', payoutAfter.farmer_id).single();
        if (f?.phone_number) {
          const tpl = Deno.env.get('WHATSAPP_PAYMENT_TEMPLATE_NAME') ?? 'farmer_payment_received_v1';
          const r = await sendWhatsAppTemplate({
            to: f.phone_number, templateName: tpl,
            params: [f.name ?? '', `₹${Number(amount).toFixed(0)}`, String(payoutAfter.status)],
          });
          await supabase.from('farmer_notifications').insert({
            farmer_id: payoutAfter.farmer_id, payout_id, channel: 'whatsapp',
            template: tpl, status: r.ok ? 'sent' : 'failed', error: r.error,
            sent_at: r.ok ? new Date().toISOString() : null,
          });
        }
      }
    }

    // If cycle has no unpaid bills left, mark fully_paid
    if (payoutAfter?.cycle_id) {
      const { count } = await supabase.from('farmer_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('cycle_id', payoutAfter.cycle_id)
        .neq('status', 'paid')
        .neq('status', 'void');
      if ((count ?? 0) === 0) {
        await supabase.from('farmer_payout_cycles')
          .update({ status: 'fully_paid', fully_paid_at: new Date().toISOString() })
          .eq('id', payoutAfter.cycle_id);
      }
    }

    return new Response(JSON.stringify({ ok: true, payout: payoutAfter }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
