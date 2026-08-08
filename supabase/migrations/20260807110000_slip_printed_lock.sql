-- Once a slip is in a farmer's hand, the figures on it stop being editable.
--
-- The paper is the farmer's copy of the deal. Editing the row behind it leaves
-- two different versions of the same collection -- the one he is holding and
-- the one that gets paid -- with nothing to say which is right. That is exactly
-- the argument the portal was built to prevent.
--
-- Corrections before printing stay open, because that is ordinary work. After
-- printing it becomes an admin decision, which is the accountability the
-- collection centre asked for rather than a restriction imposed on it.

ALTER TABLE public.milk_collections
  ADD COLUMN IF NOT EXISTS slip_printed_at timestamptz;

COMMENT ON COLUMN public.milk_collections.slip_printed_at IS
  'When a slip was first printed. Set once; reprints do not move it.';

-- Marking a slip printed has to be possible for an operator whose own UPDATE
-- policy forbids touching printed rows -- and a policy cannot allow one column
-- while refusing the rest. A definer function can, and it only ever writes this
-- one field.
CREATE OR REPLACE FUNCTION public.fn_mark_slip_printed(p_collection_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stamped timestamptz;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'worker')
    OR public.has_role(auth.uid(), 'collection_centre')
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  -- First print wins. A reprint is the same slip again, so moving the stamp
  -- would quietly extend how long the row stays editable.
  UPDATE public.milk_collections
  SET slip_printed_at = now()
  WHERE id = p_collection_id
    AND slip_printed_at IS NULL;

  SELECT mc.slip_printed_at INTO stamped
  FROM public.milk_collections mc
  WHERE mc.id = p_collection_id;

  RETURN stamped;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_mark_slip_printed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_mark_slip_printed(uuid) TO authenticated;

-- Corrections now stop at the printer.
--
-- Undo is deliberately left alone: a wrong member code is noticed *because* the
-- slip printed with the wrong name on it, so the fifteen minute window has to
-- survive printing or it would never fire when it is most needed. Voiding the
-- whole entry and starting again is honest; silently changing the figures
-- behind a slip already handed over is not.
DROP POLICY IF EXISTS "Collection centre corrects open collections" ON public.milk_collections;
CREATE POLICY "Collection centre corrects unprinted open collections"
  ON public.milk_collections
  FOR UPDATE
  USING (
    has_role((SELECT auth.uid()), 'collection_centre'::app_role)
    AND NOT public.fn_date_is_settled(collection_date)
    AND slip_printed_at IS NULL
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'collection_centre'::app_role)
    AND NOT public.fn_date_is_settled(collection_date)
    AND slip_printed_at IS NULL
  );

-- Regenerating a portal token voids every slip a farmer is holding, so unlike
-- clearing a PIN -- which the farmer can simply redo -- it is not something to
-- hand to the counter.
CREATE OR REPLACE FUNCTION public.fn_regenerate_portal_token(p_farmer_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fresh text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  fresh := public.fn_generate_portal_token();
  UPDATE public.farmers SET portal_token = fresh WHERE id = p_farmer_id;
  RETURN fresh;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_regenerate_portal_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_regenerate_portal_token(uuid) TO authenticated;
