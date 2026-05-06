import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { getCycleForDate, getPreviousCycle, istNow } from "../_shared/cycles.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const today = istNow();
    const cur = getCycleForDate(today);
    const prev = getPreviousCycle(today);

    // Ensure current cycle exists & open
    await supabase.from('farmer_payout_cycles').upsert({
      cycle_start: cur.start, cycle_end: cur.end,
      half: cur.half, year_month: cur.year_month, status: 'open',
    }, { onConflict: 'cycle_start,cycle_end', ignoreDuplicates: true });

    // Mark previous cycle as closed_for_collection if still open
    await supabase.from('farmer_payout_cycles')
      .update({ status: 'closed_for_collection' })
      .eq('cycle_start', prev.start).eq('cycle_end', prev.end)
      .eq('status', 'open');

    return new Response(JSON.stringify({ ok: true, current: cur, previous_closed: prev }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
