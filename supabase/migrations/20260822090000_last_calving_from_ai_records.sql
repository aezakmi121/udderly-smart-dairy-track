-- Keep cows.last_calving_date correct however the calving was recorded.
--
-- There are two calving paths and they behaved differently:
--
--   DeliveryWithCalfModal writes ai_records.actual_delivery_date AND a calves
--   row, so update_cow_last_calving_date() -- which is triggered on calves --
--   fires and the cow's date is right.
--
--   The board's own "Record calving" (QuickCalvingSheet) writes only
--   ai_records.actual_delivery_date. No calf row, so no trigger, so the cow's
--   last_calving_date stayed at its previous value or null.
--
-- Everything reading that column has therefore been wrong for board-recorded
-- calvings: days in milk in the reports, and the dry-off recommendations in
-- GroupingRecommendations.
--
-- Fixed by maintaining the column from ai_records as well, taking the later of
-- the two sources so neither path can move the date backwards.

CREATE OR REPLACE FUNCTION public.update_cow_last_calving_from_ai()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  target uuid;
BEGIN
  target := COALESCE(NEW.cow_id, OLD.cow_id);
  IF target IS NULL THEN
    RETURN NULL;
  END IF;

  -- COALESCE back to the stored value: a date entered by hand for a cow with
  -- neither a calf row nor a recorded delivery is the only thing anyone knows
  -- about her calving, and recomputing must not be able to erase it.
  UPDATE public.cows c
  SET last_calving_date = COALESCE(
        GREATEST(
          (SELECT MAX(r.actual_delivery_date) FROM public.ai_records r
            WHERE r.cow_id = target AND r.actual_delivery_date IS NOT NULL),
          (SELECT MAX(k.date_of_birth) FROM public.calves k
            WHERE k.mother_cow_id = target AND k.status <> 'dead')
        ),
        c.last_calving_date
      ),
      updated_at = now()
  WHERE c.id = target;

  RETURN NULL;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.update_cow_last_calving_from_ai() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ai_records_last_calving ON public.ai_records;
CREATE TRIGGER trg_ai_records_last_calving
AFTER INSERT OR UPDATE OR DELETE ON public.ai_records
FOR EACH ROW EXECUTE FUNCTION public.update_cow_last_calving_from_ai();

-- Backfill every cow from both sources. GREATEST ignores NULLs in Postgres, so
-- a cow with only one of the two still gets the right date.
UPDATE public.cows c
SET last_calving_date = COALESCE(
      GREATEST(
        (SELECT MAX(r.actual_delivery_date) FROM public.ai_records r
          WHERE r.cow_id = c.id AND r.actual_delivery_date IS NOT NULL),
        (SELECT MAX(k.date_of_birth) FROM public.calves k
          WHERE k.mother_cow_id = c.id AND k.status <> 'dead')
      ),
      c.last_calving_date
    )
WHERE c.last_calving_date IS DISTINCT FROM GREATEST(
      (SELECT MAX(r.actual_delivery_date) FROM public.ai_records r
        WHERE r.cow_id = c.id AND r.actual_delivery_date IS NOT NULL),
      (SELECT MAX(k.date_of_birth) FROM public.calves k
        WHERE k.mother_cow_id = c.id AND k.status <> 'dead')
    );
