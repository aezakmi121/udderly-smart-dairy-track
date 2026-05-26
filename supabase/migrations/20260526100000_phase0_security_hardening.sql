-- Phase 0: Stop-the-bleed security hardening
-- Addresses Supabase security advisor findings: anon-callable SECURITY DEFINER
-- functions (role enumeration / unauthenticated mutation) and an overly-broad
-- listing policy on the public cow-images storage bucket.

-- NEW-S1: prevent anon (and signed-in users) from enumerating user roles via
-- /rest/v1/rpc/has_role and /rest/v1/rpc/get_user_role. These functions remain
-- callable internally by RLS policies because the RLS engine bypasses
-- function-level EXECUTE checks.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;

-- NEW-S2: prevent anon and signed-in users from triggering daily-deliveries
-- creation via /rest/v1/rpc/create_daily_deliveries_for_date. service_role
-- can still invoke this from edge functions / cron jobs.
REVOKE EXECUTE ON FUNCTION public.create_daily_deliveries_for_date(date) FROM anon, authenticated;

-- NEW-S3: drop the overly-broad SELECT policy on the cow-images bucket.
-- Public URL access via getPublicUrl() does not require this policy; the policy
-- only enabled clients to LIST every file in the bucket, which the app does
-- not need (only upload + getPublicUrl are used).
DROP POLICY IF EXISTS "Anyone can view cow images" ON storage.objects;
