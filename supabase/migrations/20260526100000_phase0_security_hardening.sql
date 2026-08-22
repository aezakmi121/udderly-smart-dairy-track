-- Phase 0: Stop-the-bleed security hardening
--
-- Addresses Supabase security advisor findings: anon-callable SECURITY DEFINER
-- functions (role enumeration / unauthenticated mutation) and an overly-broad
-- listing policy on the public cow-images storage bucket.
--
-- ============================================================================
-- REWRITTEN. The first version of this file did not do what it claimed, twice.
--
-- 1. It revoked only "FROM anon, authenticated". CREATE FUNCTION grants EXECUTE
--    to PUBLIC, and neither role held a direct grant -- they reach these
--    functions *through* PUBLIC. The revoke therefore removed a grant that was
--    not there and changed nothing: has_function_privilege('anon', ...) still
--    returned true afterwards. PUBLIC has to be named.
--
-- 2. It asserted that "the RLS engine bypasses function-level EXECUTE checks",
--    and revoked has_role() from authenticated on that basis. It does not.
--    A policy calling has_role() raises insufficient_privilege for a role that
--    cannot execute it, and since almost every table in this schema has such a
--    policy, that revoke stops the application working for every signed-in
--    user. Verified by running SELECT as `authenticated` after applying it.
--
-- So: revoke from PUBLIC and anon, which is what the advisor finding was about
-- (unauthenticated role enumeration), and keep authenticated's grant on the two
-- functions RLS depends on.
-- ============================================================================

-- NEW-S1: stop anon enumerating user roles via /rest/v1/rpc/has_role and
-- /rest/v1/rpc/get_user_role. authenticated keeps EXECUTE because RLS policies
-- call has_role() as the querying role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- NEW-S2: stop anyone but service_role triggering daily-deliveries creation via
-- /rest/v1/rpc/create_daily_deliveries_for_date. Nothing in the client or the
-- edge functions calls this as anon or authenticated; cron and edge functions
-- use service_role.
REVOKE EXECUTE ON FUNCTION public.create_daily_deliveries_for_date(date)
  FROM PUBLIC, anon, authenticated;

-- NEW-S3: drop the overly-broad SELECT policy on the cow-images bucket.
-- Public URL access via getPublicUrl() does not require this policy; the policy
-- only enabled clients to LIST every file in the bucket, and the app only ever
-- uploads and calls getPublicUrl (CowsManagement.tsx, CalfForm.tsx).
DROP POLICY IF EXISTS "Anyone can view cow images" ON storage.objects;
