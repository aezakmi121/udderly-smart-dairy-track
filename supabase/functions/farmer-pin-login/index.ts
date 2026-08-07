import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { signFarmerJwt } from "../_shared/farmerJwt.ts";
import {
  verifyPin,
  normalisePhone,
  lockoutUntil,
  MAX_ATTEMPTS,
  DEFAULT_ITERATIONS,
} from "../_shared/farmerPin.ts";

// Mobile number + four digit PIN.
//
// Body: { phone_number: string, pin: string }
//
// Ten thousand PINs is not many, so the lockout below is what actually keeps
// this safe: five wrong guesses buys a fifteen minute wait, which puts trying
// them all a month of solid effort away.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// One message for every failure that is not a lockout. Saying "no such number"
// would turn this endpoint into a way of finding out who supplies the dairy.
const REJECTED = { error: 'invalid_credentials' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { phone_number, pin } = await req.json();
    const phone = normalisePhone(phone_number);
    const candidate = typeof pin === 'string' ? pin : '';
    if (!phone || !/^\d{4}$/.test(candidate)) return json(REJECTED, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Numbers are stored however they were typed, so match on the last ten
    // digits rather than the raw string.
    const { data: matches } = await supabase
      .from('farmers')
      .select('id, phone_number, is_active')
      .ilike('phone_number', `%${phone}`);

    const farmers = (matches ?? []).filter(
      (f) => f.is_active !== false && normalisePhone(f.phone_number) === phone,
    );

    // Two farmers sharing a number cannot be told apart, and guessing would
    // show one of them the other's earnings.
    if (farmers.length !== 1) return json(REJECTED, 401);
    const farmer = farmers[0];

    const { data: record } = await supabase
      .from('farmer_pins')
      .select('pin_hash, pin_salt, iterations, failed_attempts, locked_until')
      .eq('farmer_id', farmer.id)
      .maybeSingle();

    if (!record) return json(REJECTED, 401);

    if (record.locked_until && new Date(record.locked_until) > new Date()) {
      return json({ error: 'locked', locked_until: record.locked_until }, 423);
    }

    const ok = await verifyPin(
      candidate,
      record.pin_salt,
      record.pin_hash,
      record.iterations ?? DEFAULT_ITERATIONS,
    );

    if (!ok) {
      const attempts = (record.failed_attempts ?? 0) + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await supabase
        .from('farmer_pins')
        .update({
          failed_attempts: locked ? 0 : attempts,
          locked_until: locked ? lockoutUntil() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('farmer_id', farmer.id);

      if (locked) {
        await supabase.from('farmer_pin_events').insert({ farmer_id: farmer.id, event: 'locked' });
        return json({ error: 'locked' }, 423);
      }
      // Telling them how many tries are left is the difference between a
      // lockout that feels like a fault and one that feels like a warning.
      return json({ ...REJECTED, attempts_left: MAX_ATTEMPTS - attempts }, 401);
    }

    // A good PIN wipes the slate, so yesterday's fat fingers do not accumulate.
    if (record.failed_attempts || record.locked_until) {
      await supabase
        .from('farmer_pins')
        .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
        .eq('farmer_id', farmer.id);
    }

    const session = await signFarmerJwt({ farmer_id: farmer.id, phone });
    return json({ ok: true, token: session });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
