import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";

// Builds draft farmer_payouts rows for a cycle (idempotent).
// Pulls milk_collections in [cycle_start, cycle_end], aggregates per farmer,
// adds outstanding advances and prior-cycle unpaid balance as carry-forward.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { cycle_id } = await req.json();
    if (!cycle_id) return new Response(JSON.stringify({ error: 'cycle_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });

    const { data: cycle } = await supabase.from('farmer_payout_cycles').select('*').eq('id', cycle_id).single();
    if (!cycle) return new Response(JSON.stringify({ error: 'cycle not found' }), { status: 404, headers: corsHeaders });
    if (cycle.status === 'finalized' || cycle.status === 'fully_paid') {
      return new Response(JSON.stringify({ error: 'cycle already finalized' }), { status: 400, headers: corsHeaders });
    }

    // Aggregate milk collections per farmer in this cycle
    const { data: collections } = await supabase
      .from('milk_collections')
      .select('farmer_id, quantity, total_amount, fat_percentage, snf_percentage')
      .gte('collection_date', cycle.cycle_start)
      .lte('collection_date', cycle.cycle_end)
      .eq('is_accepted', true);

    const agg = new Map<string, { qty: number; amt: number; n: number; fat: number; snf: number }>();
    for (const c of (collections ?? [])) {
      if (!c.farmer_id) continue;
      const a = agg.get(c.farmer_id) ?? { qty: 0, amt: 0, n: 0, fat: 0, snf: 0 };
      a.qty += Number(c.quantity ?? 0);
      a.amt += Number(c.total_amount ?? 0);
      a.fat += Number(c.fat_percentage ?? 0);
      a.snf += Number(c.snf_percentage ?? 0);
      a.n += 1;
      agg.set(c.farmer_id, a);
    }

    // Previous-cycle unpaid balance per farmer (carry-forward)
    const { data: prevCycle } = await supabase
      .from('farmer_payout_cycles')
      .select('id')
      .lt('cycle_end', cycle.cycle_start)
      .order('cycle_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    const carry = new Map<string, number>();
    if (prevCycle) {
      const { data: prevPayouts } = await supabase
        .from('farmer_payouts')
        .select('farmer_id, unpaid_balance')
        .eq('cycle_id', prevCycle.id)
        .gt('unpaid_balance', 0);
      for (const p of (prevPayouts ?? [])) carry.set(p.farmer_id, Number(p.unpaid_balance));
    }

    // Outstanding advances per farmer
    const { data: advances } = await supabase
      .from('farmer_advances')
      .select('farmer_id, amount, recovered_amount')
      .eq('status', 'outstanding');
    const adv = new Map<string, number>();
    for (const a of (advances ?? [])) {
      const remaining = Number(a.amount) - Number(a.recovered_amount ?? 0);
      if (remaining > 0) adv.set(a.farmer_id, (adv.get(a.farmer_id) ?? 0) + remaining);
    }

    // Build payout rows
    const rows: any[] = [];
    const farmerIds = new Set([...agg.keys(), ...carry.keys(), ...adv.keys()]);
    for (const fid of farmerIds) {
      const a = agg.get(fid) ?? { qty: 0, amt: 0, n: 0, fat: 0, snf: 0 };
      const cf = carry.get(fid) ?? 0;
      const adRaw = adv.get(fid) ?? 0;
      // Don't deduct more advance than the milk amount allows; rest stays as outstanding
      const advanceTaken = Math.min(adRaw, a.amt);
      const net = Math.max(a.amt + cf - advanceTaken, 0);
      rows.push({
        cycle_id,
        farmer_id: fid,
        total_quantity: a.qty,
        total_amount: a.amt,
        sessions_count: a.n,
        avg_fat: a.n ? +(a.fat / a.n).toFixed(2) : null,
        avg_snf: a.n ? +(a.snf / a.n).toFixed(2) : null,
        carry_forward_in: cf,
        advances_deducted: advanceTaken,
        other_deductions: 0,
        net_payable: net,
        status: 'draft',
      });
    }

    if (rows.length) {
      // Upsert (re-runnable). Reset status/draft fields, but never overwrite paid amounts.
      const { error } = await supabase
        .from('farmer_payouts')
        .upsert(rows, { onConflict: 'cycle_id,farmer_id' });
      if (error) throw error;
    }

    await supabase.from('farmer_payout_cycles').update({ status: 'drafted' }).eq('id', cycle_id);

    return new Response(JSON.stringify({ ok: true, drafts: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
