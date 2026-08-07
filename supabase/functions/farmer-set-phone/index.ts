import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyFarmerJwt } from "../_shared/farmerJwt.ts";
import { normalisePhone } from "../_shared/farmerPin.ts";

// A farmer adding their own mobile number, from inside the portal.
//
// Body: { phone_number: string }
//
// Adding only. A farmer who already has a number on file cannot change it here,
// and that restriction is the point rather than an oversight: the session may
// have come from the QR on a slip, and whoever picks up a dropped slip holds
// one. Read access through a lost slip is a trade we accepted; letting the
// finder move the account onto their own number, then set a PIN, would convert
// a scrap of paper into permanent control of somebody else's earnings.
// Changing an existing number is a counter job, where a face is attached to it.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifyFarmerJwt(req.headers.get('x-farmer-token') ?? '');
    if (!session) return json({ error: 'unauthorized' }, 401);

    const { phone_number } = await req.json();
    const phone = normalisePhone(phone_number);
    if (!phone) return json({ error: 'invalid_phone' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: farmer } = await supabase
      .from('farmers')
      .select('id, phone_number, is_active')
      .eq('id', session.farmer_id)
      .maybeSingle();

    if (!farmer || farmer.is_active === false) return json({ error: 'unauthorized' }, 401);
    if (normalisePhone(farmer.phone_number)) return json({ error: 'already_set' }, 409);

    // The number decides who a PIN login resolves to, so it cannot be shared.
    const { data: others } = await supabase
      .from('farmers')
      .select('id, phone_number, is_active')
      .ilike('phone_number', `%${phone}`);

    const taken = (others ?? []).some(
      (f) => f.id !== farmer.id && f.is_active !== false && normalisePhone(f.phone_number) === phone,
    );
    // Deliberately does not say whose it is: this endpoint is reachable by
    // anyone holding a slip, and confirming a number belongs to a supplier
    // would make it a lookup tool.
    if (taken) return json({ error: 'phone_taken' }, 409);

    const { error } = await supabase
      .from('farmers')
      .update({ phone_number: phone })
      .eq('id', farmer.id);
    if (error) throw error;

    await supabase.from('farmer_phone_events').insert({
      farmer_id: farmer.id,
      phone_number: phone,
      source: 'self',
    });

    return json({ ok: true, phone_number: phone });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
