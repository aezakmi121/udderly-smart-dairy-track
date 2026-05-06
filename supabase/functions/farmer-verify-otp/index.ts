import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { signFarmerJwt } from "../_shared/farmerJwt.ts";

// Body: { phone_number, code }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { phone_number, code } = await req.json();
    const phone = (phone_number ?? '').replace(/\D/g, '').slice(-10);
    if (phone.length !== 10 || !/^\d{6}$/.test(code ?? '')) {
      return new Response(JSON.stringify({ error: 'bad request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const enc = new TextEncoder().encode(code + ':' + phone);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const codeHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const { data: row } = await supabase.from('farmer_otp_codes')
      .select('*').eq('phone_number', phone).is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (!row) return new Response(JSON.stringify({ error: 'expired' }), { status: 401, headers: corsHeaders });
    if (row.attempts >= 5) return new Response(JSON.stringify({ error: 'too many attempts' }), { status: 429, headers: corsHeaders });

    if (row.code_hash !== codeHash) {
      await supabase.from('farmer_otp_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
      return new Response(JSON.stringify({ error: 'invalid code' }), { status: 401, headers: corsHeaders });
    }

    await supabase.from('farmer_otp_codes').update({ used_at: new Date().toISOString() }).eq('id', row.id);

    const { data: farmer } = await supabase.from('farmers')
      .select('id').ilike('phone_number', `%${phone}`).maybeSingle();
    if (!farmer) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders });

    const token = await signFarmerJwt({ farmer_id: farmer.id, phone });
    return new Response(JSON.stringify({ ok: true, token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
