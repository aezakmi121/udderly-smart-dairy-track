-- A trigger function has no business being callable over the REST API.
--
-- The security advisor flagged apply_payout_deduction_override() as reachable
-- at /rest/v1/rpc/apply_payout_deduction_override by both anon and
-- authenticated, because CREATE FUNCTION grants EXECUTE to PUBLIC by default.
-- The trigger runs as the table owner, so nothing needs the grant.
REVOKE EXECUTE ON FUNCTION public.apply_payout_deduction_override() FROM PUBLIC, anon, authenticated;
