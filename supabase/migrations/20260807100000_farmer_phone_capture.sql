-- Get mobile numbers on file, because the PIN has nothing to pair with without
-- one.
--
-- 29 of 61 farmers have a usable number. The other 32 can only ever reach the
-- portal through the QR on a slip, which means losing the slip locks them out
-- until they walk to the counter. Two ways in: the farmer adds it themselves
-- once they are signed in, or the operator takes it at the counter.
--
-- The number is a login identifier now, not a contact detail, so it has to
-- point at exactly one farmer.

CREATE TABLE IF NOT EXISTS public.farmer_phone_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  phone_number text,
  -- 'self' means the farmer typed it into the portal, which is worth being
  -- able to tell apart when reviewing who can sign in as whom.
  source text NOT NULL CHECK (source IN ('self', 'staff')),
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farmer_phone_events_farmer_idx
  ON public.farmer_phone_events (farmer_id, created_at DESC);

ALTER TABLE public.farmer_phone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read phone history" ON public.farmer_phone_events;
CREATE POLICY "Staff can read phone history"
  ON public.farmer_phone_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'collection_centre')
  );

-- Numbers are stored however they were typed -- with +91, with spaces, with a
-- leading zero -- so uniqueness has to be judged on the last ten digits, the
-- same way login resolves them.
CREATE UNIQUE INDEX IF NOT EXISTS farmers_active_phone_key
  ON public.farmers (right(regexp_replace(phone_number, '\D', '', 'g'), 10))
  WHERE is_active
    AND length(regexp_replace(phone_number, '\D', '', 'g')) >= 10;

-- The collection centre can read farmers but not write them, and row security
-- cannot restrict a policy to a single column. A definer function can: this
-- touches the number and nothing else, so an operator taking a phone number at
-- the counter cannot also rename a farmer or reactivate one.
CREATE OR REPLACE FUNCTION public.fn_set_farmer_phone(p_farmer_id uuid, p_phone text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digits text;
  clash  text;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'worker')
    OR public.has_role(auth.uid(), 'collection_centre')
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  digits := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);

  -- Clearing a wrong number is a legitimate correction.
  IF digits = '' THEN
    UPDATE public.farmers SET phone_number = NULL WHERE id = p_farmer_id;
    INSERT INTO public.farmer_phone_events (farmer_id, phone_number, source, actor)
    VALUES (p_farmer_id, NULL, 'staff', auth.uid());
    RETURN NULL;
  END IF;

  IF length(digits) <> 10 THEN
    RAISE EXCEPTION 'a mobile number needs ten digits';
  END IF;

  SELECT f.name INTO clash
  FROM public.farmers f
  WHERE f.is_active
    AND f.id <> p_farmer_id
    AND right(regexp_replace(coalesce(f.phone_number, ''), '\D', '', 'g'), 10) = digits
  LIMIT 1;

  IF clash IS NOT NULL THEN
    -- Naming the other farmer is fine here: this is staff-facing, and the
    -- operator needs to know which record to fix.
    RAISE EXCEPTION 'that number already belongs to %', clash;
  END IF;

  UPDATE public.farmers SET phone_number = digits WHERE id = p_farmer_id;
  INSERT INTO public.farmer_phone_events (farmer_id, phone_number, source, actor)
  VALUES (p_farmer_id, digits, 'staff', auth.uid());

  RETURN digits;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_set_farmer_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_set_farmer_phone(uuid, text) TO authenticated;
