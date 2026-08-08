import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyFarmerJwt } from "../_shared/farmerJwt.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('x-farmer-token') ?? '';
    const session = await verifyFarmerJwt(auth);
    if (!session) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const farmerId = session.farmer_id;

    const { data: farmer } = await supabase.from('farmers')
      .select('id, name, farmer_code, phone_number').eq('id', farmerId).single();

    // Current open cycle running total
    const today = new Date().toISOString().slice(0, 10);
    const { data: cycle } = await supabase.from('farmer_payout_cycles')
      .select('*').lte('cycle_start', today).gte('cycle_end', today)
      .order('cycle_start', { ascending: false }).limit(1).maybeSingle();

    let liveTotal = { qty: 0, amount: 0, sessions: 0 };
    if (cycle) {
      const { data: collections } = await supabase.from('milk_collections')
        .select('quantity, total_amount')
        .eq('farmer_id', farmerId).eq('is_accepted', true)
        .gte('collection_date', cycle.cycle_start).lte('collection_date', cycle.cycle_end);
      for (const c of (collections ?? [])) {
        liveTotal.qty += Number(c.quantity ?? 0);
        liveTotal.amount += Number(c.total_amount ?? 0);
        liveTotal.sessions += 1;
      }
    }

    // Last 6 bills
    const { data: bills } = await supabase.from('farmer_payouts')
      .select('id, bill_number, total_quantity, total_amount, advances_deducted, carry_forward_in, net_payable, paid_amount, unpaid_balance, status, paid_on, last_payment_method, finalized_at, pdf_storage_path, cycle_id, farmer_payout_cycles(cycle_start, cycle_end)')
      .eq('farmer_id', farmerId).neq('status', 'draft')
      .order('finalized_at', { ascending: false }).limit(6);

    // Outstanding advances
    const { data: advances } = await supabase.from('farmer_advances')
      .select('id, advance_date, amount, recovered_amount, status, notes')
      .eq('farmer_id', farmerId).order('advance_date', { ascending: false });

    // Recent collections. The portal groups these into days itself, so it needs
    // the whole row a slip was printed from: which animal, when it was weighed,
    // and why a sample was turned away. Sixty days is roughly four payout
    // cycles, which is as far back as anyone asks at the counter.
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const { data: daily } = await supabase.from('milk_collections')
      .select('id, collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, is_accepted, species, remarks, created_at')
      .eq('farmer_id', farmerId).gte('collection_date', since)
      .order('collection_date', { ascending: false }).limit(250);

    // Enough for the portal to offer PIN setup, and nothing that would help
    // guess an existing one.
    const { data: pinRow } = await supabase.from('farmer_pins')
      .select('farmer_id').eq('farmer_id', farmerId).maybeSingle();
    const pin = {
      isSet: !!pinRow,
      canSet: !!String(farmer?.phone_number ?? '').replace(/\D/g, '').match(/\d{10}$/),
    };

    return new Response(JSON.stringify({
      farmer, cycle, liveTotal, bills: bills ?? [], advances: advances ?? [], daily: daily ?? [], pin,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
