import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { sendWhatsAppTemplate } from "../_shared/whatsapp.ts";

// Body: { phone_number: string }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { phone_number } = await req.json();
    const phone = (phone_number ?? '').replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) return new Response(JSON.stringify({ error: 'invalid phone' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: farmer } = await supabase.from('farmers')
      .select('id, name, phone_number, is_active').ilike('phone_number', `%${phone}`).maybeSingle();
    if (!farmer || farmer.is_active === false) {
      // Don't reveal existence
      return new Response(JSON.stringify({ ok: true, channel: 'unknown' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate-limit: max 3 OTPs per 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase.from('farmer_otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', phone).gte('created_at', tenMinAgo);
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const codeNum = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const code = String(codeNum).padStart(6, '0');
    const enc = new TextEncoder().encode(code + ':' + phone);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const codeHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    let channel = 'staff';
    let deliveryStatus = 'pending';
    const wa = await sendWhatsAppTemplate({
      to: phone,
      templateName: Deno.env.get('WHATSAPP_OTP_TEMPLATE_NAME') ?? 'farmer_otp_v1',
      params: [code],
    });
    if (wa.ok) { channel = 'whatsapp'; deliveryStatus = 'sent'; }

    await supabase.from('farmer_otp_codes').insert({
      phone_number: phone, code_hash: codeHash, expires_at: expires,
      delivery_channel: channel, delivery_status: deliveryStatus,
    });

    return new Response(JSON.stringify({ ok: true, channel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
