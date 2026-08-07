import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyFarmerJwt } from "../_shared/farmerJwt.ts";
import {
  hashPin,
  verifyPin,
  newSalt,
  pinProblem,
  normalisePhone,
  DEFAULT_ITERATIONS,
} from "../_shared/farmerPin.ts";

// Set or change a PIN. Requires a portal session, which today means the farmer
// scanned the QR on their own slip.
//
// Body: { pin: string, current_pin?: string }
//
// Changing an existing PIN needs the current one even though the caller already
// holds a session. The QR is a bearer token -- whoever picks up a dropped slip
// has one -- and read access is a deliberate trade, but letting that person set
// a PIN would lock the farmer out of their own account. Forgotten PINs are
// cleared at the counter instead, and only ever cleared.
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

    const { pin, current_pin } = await req.json();
    const problem = pinProblem(typeof pin === 'string' ? pin : '');
    if (problem) return json({ error: 'weak_pin', reason: problem }, 400);

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

    // The PIN is only ever used alongside a mobile number. Without one on file
    // there is nothing to log in with, so setting it would be a dead end.
    if (!normalisePhone(farmer.phone_number)) return json({ error: 'no_phone' }, 409);

    const { data: existing } = await supabase
      .from('farmer_pins')
      .select('pin_hash, pin_salt, iterations')
      .eq('farmer_id', farmer.id)
      .maybeSingle();

    if (existing) {
      const supplied = typeof current_pin === 'string' ? current_pin : '';
      const ok =
        /^\d{4}$/.test(supplied) &&
        (await verifyPin(
          supplied,
          existing.pin_salt,
          existing.pin_hash,
          existing.iterations ?? DEFAULT_ITERATIONS,
        ));
      if (!ok) return json({ error: 'current_pin_wrong' }, 403);
    }

    const salt = newSalt();
    const hash = await hashPin(pin, salt, DEFAULT_ITERATIONS);
    const now = new Date().toISOString();

    const { error } = await supabase.from('farmer_pins').upsert({
      farmer_id: farmer.id,
      pin_hash: hash,
      pin_salt: salt,
      iterations: DEFAULT_ITERATIONS,
      failed_attempts: 0,
      locked_until: null,
      set_at: now,
      updated_at: now,
    });
    if (error) throw error;

    await supabase.from('farmer_pin_events').insert({
      farmer_id: farmer.id,
      event: existing ? 'changed' : 'set',
    });

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
