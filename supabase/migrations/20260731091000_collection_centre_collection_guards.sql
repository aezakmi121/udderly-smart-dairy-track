-- Stop the collection centre deleting or rewriting settled collections.
--
-- One blanket policy gave the collection centre INSERT, UPDATE and DELETE on
-- every milk collection, on any date, including periods already paid out. The
-- operator is semi-skilled and works at speed, so a mis-tap should not be able
-- to erase history or move money that has been settled.
--
-- Reading stays unrestricted: totals are shared openly with farmers anyway, and
-- an operator who can quote a rate confidently is useful rather than a risk.

-- Is this date inside a payout cycle that has already been finalised?
-- SECURITY DEFINER so the check does not depend on the caller being able to
-- read the cycles table, and cannot be subverted by policies on it.
CREATE OR REPLACE FUNCTION public.fn_date_is_settled(p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.farmer_payout_cycles pc
    WHERE pc.status = 'finalized'
      AND p_date BETWEEN pc.cycle_start AND pc.cycle_end
  );
$function$;

GRANT EXECUTE ON FUNCTION public.fn_date_is_settled(date) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can manage milk collections based on role" ON public.milk_collections;

-- Admins and farm workers are unchanged.
CREATE POLICY "Admins and workers manage collections"
  ON public.milk_collections
  FOR ALL
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR has_role((SELECT auth.uid()), 'worker'::app_role)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR has_role((SELECT auth.uid()), 'worker'::app_role)
  );

CREATE POLICY "Collection centre views collections"
  ON public.milk_collections
  FOR SELECT
  USING (has_role((SELECT auth.uid()), 'collection_centre'::app_role));

CREATE POLICY "Collection centre records collections"
  ON public.milk_collections
  FOR INSERT
  WITH CHECK (
    has_role((SELECT auth.uid()), 'collection_centre'::app_role)
    AND NOT public.fn_date_is_settled(collection_date)
  );

-- Corrections are allowed while the period is still open, and the row may not
-- be moved into a settled period on the way through.
CREATE POLICY "Collection centre corrects open collections"
  ON public.milk_collections
  FOR UPDATE
  USING (
    has_role((SELECT auth.uid()), 'collection_centre'::app_role)
    AND NOT public.fn_date_is_settled(collection_date)
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'collection_centre'::app_role)
    AND NOT public.fn_date_is_settled(collection_date)
  );

-- No DELETE policy for the collection centre, so deletes are refused outright.
-- Removing a collection is an admin action.
