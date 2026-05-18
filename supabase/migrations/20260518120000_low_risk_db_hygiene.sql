-- Low-risk hygiene fixes flagged by the Supabase database linter.
-- Each item below was reviewed individually; none changes application behaviour.

-- 1. Duplicate index (linter 0009)
--    idx_vaccination_records_next_due and idx_vaccination_records_next_due_date
--    are identical btree indexes on vaccination_records(next_due_date).
--    Drop the redundant one; the other continues to serve all queries.
DROP INDEX IF EXISTS public.idx_vaccination_records_next_due;

-- 2. Mutable function search_path (linter 0011)
--    Pin search_path on the updated_at trigger function so it is not
--    role-dependent. The function only touches NEW, so this is inert.
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

-- 3. Unintended public RPC exposure of SECURITY DEFINER functions
--    (linter 0028 / 0029)
--    These are trigger functions. Triggers do NOT require EXECUTE on the
--    function, so revoking it leaves trigger behaviour untouched and only
--    removes the unintended /rest/v1/rpc/* exposure. Verified: no app or
--    edge-function code calls any of these via supabase.rpc().
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_cow_last_calving_date()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_ghee_stock()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_farmer_payout_from_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_ffm_stock_from_distribution() FROM PUBLIC, anon, authenticated;
