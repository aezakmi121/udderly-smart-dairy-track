-- Impact preview for publishing a rate list.
--
-- Loading a list dated in the past does not change what has already been
-- recorded -- collections keep their stored rate_per_liter/total_amount, and
-- payouts and bills read those stored values rather than re-pricing. The real
-- hazard is inconsistency going forward: any collection newly entered or edited
-- into that window will price on the new list, so two collections on the same
-- day can end up on different rates. Worse if the window is already paid out.
--
-- This reports what a given effective point would affect, so the uploader can
-- confirm deliberately. It reads only; it never changes anything.
CREATE OR REPLACE FUNCTION public.fn_rate_change_impact(
  p_date date,
  p_session text DEFAULT 'morning'
)
RETURNS TABLE(
  affected_collections bigint,
  affected_amount numeric,
  first_date date,
  last_date date,
  finalized_cycles bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH want AS (
    SELECT CASE WHEN lower(coalesce(p_session, 'morning')) = 'evening' THEN 1 ELSE 0 END AS rank
  ),
  hit AS (
    SELECT c.collection_date, c.total_amount
    FROM public.milk_collections c, want w
    WHERE (c.collection_date, CASE WHEN c.session = 'evening' THEN 1 ELSE 0 END)
          >= (p_date, w.rank)
  )
  SELECT
    (SELECT count(*) FROM hit),
    (SELECT coalesce(sum(total_amount), 0) FROM hit),
    (SELECT min(collection_date) FROM hit),
    (SELECT max(collection_date) FROM hit),
    (SELECT count(*) FROM public.farmer_payout_cycles pc
      WHERE pc.status = 'finalized' AND pc.cycle_end >= p_date);
$function$;

GRANT EXECUTE ON FUNCTION public.fn_rate_change_impact(date, text) TO anon, authenticated, service_role;
