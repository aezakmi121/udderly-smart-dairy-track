-- Name the collection centre role for what it is.
--
-- The role an operator logs in with was called 'farmer'. That was already
-- confusing, and it is now actively misleading: /farmer is a real portal where
-- actual farmers sign in with a phone OTP, and the two have nothing to do with
-- each other. A policy stores the enum value rather than its label, so renaming
-- carries through every existing policy and row at once.
--
-- No real farmer needs an app_role: the portal authenticates by phone OTP
-- through its own edge functions and never consults user_roles. So this renames
-- rather than adding a second role that nothing would use.
--
-- Kept in its own migration because the renamed label is only safe to reference
-- once this has committed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'farmer'
  ) THEN
    ALTER TYPE public.app_role RENAME VALUE 'farmer' TO 'collection_centre';
  END IF;
END $$;
