// Farmer-initiated advance request. Authenticated by farmer JWT (x-farmer-token).
// Body: { amount, reason? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyFarmerJwt } from "../_shared/farmerJwt.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('x-farmer-token') ?? '';
    const session = await verifyFarmerJwt(auth);
    if (!session) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

    const { amount, reason } = await req.json();
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > 100000) {
      return new Response(JSON.stringify({ error: 'invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Rate-limit: 1 pending request per farmer
    const { data: existing } = await supabase.from('farmer_advance_requests')
      .select('id').eq('farmer_id', session.farmer_id).eq('status', 'pending').maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: 'already_pending' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase.from('farmer_advance_requests').insert({
      farmer_id: session.farmer_id, amount: amt, reason: reason ?? null,
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, request: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
