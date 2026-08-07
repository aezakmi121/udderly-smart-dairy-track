import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";
import { billNumber } from "../_shared/cycles.ts";
import { buildFarmerBillPdf, type BillData } from "../_shared/billPdf.ts";

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
      .select('id, farmer_id, bill_number, net_payable, total_quantity, total_amount, sessions_count, avg_fat, avg_snf, advances_deducted, carry_forward_in, other_deductions')
      .eq('cycle_id', cycle_id);

    const farmerIds = (payouts ?? []).map((p) => p.farmer_id);
    const { data: farmers } = await supabase
      .from('farmers').select('id, name, farmer_code, phone_number, portal_token').in('id', farmerIds);
    const fmap = new Map((farmers ?? []).map((f) => [f.id, f]));

    // Org name from app_settings
    const { data: orgSetting } = await supabase.from('app_settings').select('value').eq('key', 'organization_settings').maybeSingle();
    const portalBase = (Deno.env.get('PORTAL_BASE_URL') ?? '').replace(/\/+$/, '');
    const orgName = (orgSetting?.value as any)?.organization_name ?? "Dairy";

    let pdfsCreated = 0;

    for (const p of (payouts ?? [])) {
      const f = fmap.get(p.farmer_id);
      const bn = p.bill_number ?? billNumber(cycle.year_month, cycle.half, f?.farmer_code ?? p.farmer_id.slice(0, 6));

      // Daily detail
      const { data: rows } = await supabase.from('milk_collections')
        .select('collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount')
        .eq('farmer_id', p.farmer_id).eq('is_accepted', true)
        .gte('collection_date', cycle.cycle_start).lte('collection_date', cycle.cycle_end)
        .order('collection_date', { ascending: true });

      // Generate PDF
      let pdfPath: string | null = null;
      try {
        const billData: BillData = {
          bill_number: bn,
          cycle_start: cycle.cycle_start,
          cycle_end: cycle.cycle_end,
          farmer: { name: f?.name ?? '', farmer_code: f?.farmer_code ?? '', phone_number: f?.phone_number ?? null },
          org_name: orgName,
          // Same code the collection slips carry. Without a configured portal
          // address the bill simply prints without it.
          portal_url: portalBase && f?.portal_token ? `${portalBase}/f/${f.portal_token}` : null,
          payout: {
            total_quantity: Number(p.total_quantity ?? 0),
            total_amount: Number(p.total_amount ?? 0),
            sessions_count: Number(p.sessions_count ?? 0),
            avg_fat: p.avg_fat as any,
            avg_snf: p.avg_snf as any,
            advances_deducted: Number(p.advances_deducted ?? 0),
            carry_forward_in: Number(p.carry_forward_in ?? 0),
            other_deductions: Number(p.other_deductions ?? 0),
            net_payable: Number(p.net_payable ?? 0),
          },
          rows: (rows ?? []) as any,
        };
        const bytes = buildFarmerBillPdf(billData);
        pdfPath = `${cycle.year_month}/${cycle.half}/${bn}.pdf`;
        const { error: upErr } = await supabase.storage.from('farmer-bills')
          .upload(pdfPath, bytes, { contentType: 'application/pdf', upsert: true });
        if (upErr) { console.error('pdf upload', upErr); pdfPath = null; }
        else pdfsCreated++;
      } catch (e) {
        console.error('pdf build error', (e as Error).message);
      }

      await supabase.from('farmer_payouts')
        .update({
          bill_number: bn,
          status: 'finalized',
          finalized_at: new Date().toISOString(),
          pdf_storage_path: pdfPath,
        })
        .eq('id', p.id);

      // Mark advances recovered (FIFO). Idempotent: each (advance, payout)
      // recovery is recorded in farmer_advance_recoveries with a UNIQUE
      // constraint, so re-running finalize on the same cycle does not
      // double-deduct from farmer_advances.recovered_amount.
      const { data: payoutRow } = await supabase.from('farmer_payouts').select('advances_deducted').eq('id', p.id).single();
      const remainingToRecover = Number(payoutRow?.advances_deducted ?? 0);
      const { data: alreadyRecovered } = await supabase
        .from('farmer_advance_recoveries')
        .select('id').eq('payout_id', p.id).limit(1);
      if (remainingToRecover > 0 && (!alreadyRecovered || alreadyRecovered.length === 0)) {
        const { data: advs } = await supabase.from('farmer_advances')
          .select('id, amount, recovered_amount').eq('farmer_id', p.farmer_id).eq('status', 'outstanding')
          .order('advance_date', { ascending: true });
        let remaining = remainingToRecover;
        for (const a of (advs ?? [])) {
          if (remaining <= 0) break;
          const left = Number(a.amount) - Number(a.recovered_amount ?? 0);
          const take = Math.min(left, remaining);
          if (take <= 0) continue;
          const newRec = Number(a.recovered_amount ?? 0) + take;
          await supabase.from('farmer_advances').update({
            recovered_amount: newRec,
            status: newRec >= Number(a.amount) ? 'recovered' : 'outstanding',
            recovered_in_payout_id: p.id,
          }).eq('id', a.id);
          await supabase.from('farmer_advance_recoveries').insert({
            advance_id: a.id, payout_id: p.id, amount: take,
          });
          remaining -= take;
        }
      }
    }

    await supabase.from('farmer_payout_cycles')
      .update({ status: 'finalized', finalized_at: new Date().toISOString(), finalized_by: userData.user.id })
      .eq('id', cycle_id);

    // WhatsApp notify (best-effort, only if configured)
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

    return new Response(JSON.stringify({ ok: true, finalized: payouts?.length ?? 0, pdfs: pdfsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
