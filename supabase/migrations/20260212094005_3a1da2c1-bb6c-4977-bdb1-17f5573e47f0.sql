
-- 1. Fix profiles UPDATE policy: prevent users from changing their own role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile non-role fields"
ON public.profiles
FOR UPDATE
USING ((SELECT auth.uid()) = id)
WITH CHECK (
  (SELECT auth.uid()) = id
  AND (
    role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid())
  )
);

-- 2. Make expense-receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';

-- 3. Restrict notification_history INSERT to service_role only
DROP POLICY IF EXISTS "System can insert notification history" ON public.notification_history;
CREATE POLICY "Only service role can insert notification history"
ON public.notification_history
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
