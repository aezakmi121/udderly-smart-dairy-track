-- A way into the portal that survives losing the slip.
--
-- Until now the only working door was the QR, which means a farmer who mislaid
-- his slip had to come to the counter. The OTP path that used to sit alongside
-- it could never work: farmer-send-otp stored only a hash of the code and threw
-- the plaintext away, WhatsApp delivery was never configured, and the fallback
-- told the farmer to ask the office -- where no screen has ever shown it.
--
-- So: mobile number plus a four digit PIN, with the QR kept as the permanent
-- fallback for the 32 of 61 farmers who have no usable number.
--
-- A four digit PIN is ten thousand guesses. Hashing it does not change that, so
-- the real defence is the lockout below; the hash is here so that nobody with
-- database access can simply read a farmer's PIN.

CREATE TABLE IF NOT EXISTS public.farmer_pins (
  farmer_id uuid PRIMARY KEY REFERENCES public.farmers(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  -- Stored per row so the cost can be raised later without invalidating
  -- every PIN already set.
  iterations integer NOT NULL DEFAULT 150000,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  set_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enabled with no policies at all: nothing reaches this table through the
-- client. The login functions use the service role, and staff go through the
-- two definer functions below, which never expose the hash.
ALTER TABLE public.farmer_pins ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.farmer_pins IS
  'Farmer portal PINs. Never readable from the client; see fn_farmer_pin_status and fn_clear_farmer_pin.';

-- Clearing someone's PIN is the one staff-side action here that could be
-- abused, so every one of them leaves a row.
CREATE TABLE IF NOT EXISTS public.farmer_pin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('set', 'changed', 'cleared', 'locked')),
  -- The staff member who cleared it; null when the farmer acted for themselves.
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farmer_pin_events_farmer_idx
  ON public.farmer_pin_events (farmer_id, created_at DESC);

ALTER TABLE public.farmer_pin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read PIN history" ON public.farmer_pin_events;
CREATE POLICY "Staff can read PIN history"
  ON public.farmer_pin_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'collection_centre')
  );
-- Writes come from the definer function and the edge functions only.

-- Whether a farmer has a PIN, and whether they are locked out. Deliberately
-- returns nothing that would help guess the PIN itself.
CREATE OR REPLACE FUNCTION public.fn_farmer_pin_status(p_farmer_id uuid)
RETURNS TABLE (is_set boolean, is_locked boolean, locked_until timestamptz, failed_attempts integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'collection_centre')
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  RETURN QUERY
    SELECT true,
           (fp.locked_until IS NOT NULL AND fp.locked_until > now()),
           fp.locked_until,
           fp.failed_attempts
    FROM public.farmer_pins fp
    WHERE fp.farmer_id = p_farmer_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::timestamptz, 0;
  END IF;
END;
$$;

-- Staff can clear a PIN but never set one.
--
-- That asymmetry is the whole point: an operator who could set a PIN could sign
-- in as the farmer. Clearing only takes the door off its hinges -- the farmer
-- then scans their slip and chooses a new PIN themselves, which nobody else
-- ever learns.
CREATE OR REPLACE FUNCTION public.fn_clear_farmer_pin(p_farmer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'collection_centre')
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  DELETE FROM public.farmer_pins WHERE farmer_id = p_farmer_id;
  GET DIAGNOSTICS removed = ROW_COUNT;

  IF removed > 0 THEN
    INSERT INTO public.farmer_pin_events (farmer_id, event, actor)
    VALUES (p_farmer_id, 'cleared', auth.uid());
  END IF;

  RETURN removed > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_farmer_pin_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_clear_farmer_pin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_farmer_pin_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_clear_farmer_pin(uuid) TO authenticated;
