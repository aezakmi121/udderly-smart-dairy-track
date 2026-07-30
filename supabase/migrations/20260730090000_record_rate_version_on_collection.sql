-- Record which rate list priced each collection.
--
-- The slip can then state the version as a fact rather than re-deriving it at
-- print time. Re-deriving would usually agree, but not if a list is later
-- published with an earlier effective date -- exactly the case the upload
-- screen now warns about. For settling a dispute the stored value is the
-- honest one: it is what was actually used.
--
-- Nullable: collections recorded before this migration have no version to
-- record, and the slip simply omits the line for them.
ALTER TABLE public.milk_collections
  ADD COLUMN IF NOT EXISTS rate_effective_from date,
  ADD COLUMN IF NOT EXISTS rate_effective_session text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'milk_collections_rate_effective_session_check'
  ) THEN
    ALTER TABLE public.milk_collections
      ADD CONSTRAINT milk_collections_rate_effective_session_check
      CHECK (rate_effective_session IS NULL OR rate_effective_session IN ('morning', 'evening'));
  END IF;
END $$;

COMMENT ON COLUMN public.milk_collections.rate_effective_from IS
  'effective_from of the rate_matrix version that priced this collection';
COMMENT ON COLUMN public.milk_collections.rate_effective_session IS
  'effective_session of the rate_matrix version that priced this collection';
