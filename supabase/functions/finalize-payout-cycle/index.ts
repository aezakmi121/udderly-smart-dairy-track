import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";
import { billNumber } from "../_shared/cycles.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { cycle_id } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });

    const { data: cycle } = await supabase.from('farmer_payout_cycles').select('*').eq('id', cycle_id).single();
    if (!cycle) return new Response(JSON.stringify({ error: 'cycle not found' }), { status: 404, headers: corsHeaders });

    const { data: payouts } = await supabase
      .from('farmer_payouts')
      .select('id, farmer_id, bill_number, net_payable')
      .eq('cycle_id', cycle_id);

    // Pull farmer codes/phones
    const farmerIds = (payouts ?? []).map((p) => p.farmer_id);
    const { data: farmers } = await supabase
      .from('farmers').select('id, name, farmer_code, phone_number').in('id', farmerIds);
    const fmap = new Map((farmers ?? []).map((f) => [f.id, f]));

    // Assign bill numbers + lock
    for (const p of (payouts ?? [])) {
      const f = fmap.get(p.farmer_id);
      const bn = p.bill_number ?? billNumber(cycle.year_month, cycle.half, f?.farmer_code ?? p.farmer_id.slice(0, 6));
      await supabase.from('farmer_payouts')
        .update({ bill_number: bn, status: 'finalized', finalized_at: new Date().toISOString() })
        .eq('id', p.id);

      // Mark advances as recovered up to deducted amount (simple FIFO)
      const { data: payoutRow } = await supabase.from('farmer_payouts').select('advances_deducted').eq('id', p.id).single();
      let remaining = Number(payoutRow?.advances_deducted ?? 0);
      if (remaining > 0) {
        const { data: advs } = await supabase.from('farmer_advances')
          .select('id, amount, recovered_amount').eq('farmer_id', p.farmer_id).eq('status', 'outstanding')
          .order('advance_date', { ascending: true });
        for (const a of (advs ?? [])) {
          if (remaining <= 0) break;
          const left = Number(a.amount) - Number(a.recovered_amount ?? 0);
          const take = Math.min(left, remaining);
          const newRec = Number(a.recovered_amount ?? 0) + take;
          await supabase.from('farmer_advances').update({
            recovered_amount: newRec,
            status: newRec >= Number(a.amount) ? 'recovered' : 'outstanding',
            recovered_in_payout_id: p.id,
          }).eq('id', a.id);
          remaining -= take;
        }
      }
    }

    await supabase.from('farmer_payout_cycles')
      .update({ status: 'finalized', finalized_at: new Date().toISOString(), finalized_by: userData.user.id })
      .eq('id', cycle_id);

    // Notify (best-effort)
    const tplName = Deno.env.get('WHATSAPP_BILL_TEMPLATE_NAME') ?? 'farmer_bill_ready_v1';
    for (const p of (payouts ?? [])) {
      const f = fmap.get(p.farmer_id);
      if (!f?.phone_number) continue;
      const r = await sendWhatsAppTemplate({
        to: f.phone_number,
        templateName: tplName,
        params: [f.name ?? '', `${cycle.cycle_start} - ${cycle.cycle_end}`, `₹${Number(p.net_payable).toFixed(0)}`],
      });
      await supabase.from('farmer_notifications').insert({
        farmer_id: f.id, payout_id: p.id, channel: 'whatsapp',
        template: tplName, status: r.ok ? 'sent' : 'failed', error: r.error,
        sent_at: r.ok ? new Date().toISOString() : null,
      });
    }

    return new Response(JSON.stringify({ ok: true, finalized: payouts?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
