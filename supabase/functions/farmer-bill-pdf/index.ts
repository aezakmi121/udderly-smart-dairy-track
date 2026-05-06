import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyFarmerJwt } from "../_shared/farmerJwt.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('x-farmer-token') ?? '';
    const session = await verifyFarmerJwt(auth);
    if (!session) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

    const url = new URL(req.url);
    const payoutId = url.searchParams.get('payout_id');
    if (!payoutId) return new Response(JSON.stringify({ error: 'payout_id required' }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: payout } = await supabase.from('farmer_payouts')
      .select('id, farmer_id, pdf_storage_path').eq('id', payoutId).single();
    if (!payout || payout.farmer_id !== session.farmer_id) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders });
    }
    if (!payout.pdf_storage_path) {
      return new Response(JSON.stringify({ error: 'pdf not generated' }), { status: 404, headers: corsHeaders });
    }
    const { data: signed } = await supabase.storage.from('farmer-bills')
      .createSignedUrl(payout.pdf_storage_path, 300);

    return new Response(JSON.stringify({ url: signed?.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
