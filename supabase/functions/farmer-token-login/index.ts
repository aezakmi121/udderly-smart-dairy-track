import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { signFarmerJwt } from "../_shared/farmerJwt.ts";

// Exchange the token printed on a collection slip for a portal session.
//
// Body: { token: string }
//
// The token is a bearer credential, so this deliberately reveals nothing about
// whether a given token exists beyond succeeding or failing, and never returns
// farmer details -- the caller gets a session and reads its own data through
// the usual portal endpoint.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    const clean = typeof token === 'string' ? token.trim() : '';

    // Reject anything that is not shaped like a token before touching the
    // database, so a scan of random text costs nothing.
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(clean)) {
      return new Response(JSON.stringify({ error: 'invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: farmer } = await supabase
      .from('farmers')
      .select('id, phone_number, is_active')
      .eq('portal_token', clean)
      .maybeSingle();

    if (!farmer || farmer.is_active === false) {
      return new Response(JSON.stringify({ error: 'invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Same session the OTP path issues, so the portal itself needs no changes.
    const session = await signFarmerJwt({
      farmer_id: farmer.id,
      phone: farmer.phone_number ?? '',
    });

    return new Response(JSON.stringify({ ok: true, token: session }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
