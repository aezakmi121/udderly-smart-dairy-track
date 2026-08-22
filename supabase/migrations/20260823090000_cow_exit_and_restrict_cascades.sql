-- A cow leaving the herd is a fact to record, not a row to delete.
--
-- The cows screen had no way to mark a cow dead and one red bin icon behind a
-- confirm(), so nine animals aged two to four years -- long since sold or dead
-- -- still read as active, and every count in the app carried them.
--
-- Pre-flight (verified against gjimccbtclynetngfrpw before writing):
--   0 orphans in ai_records, calves, milk_production, weight_logs,
--   vaccination_records or cow_group_assignments pointing at a missing cow.

-- ============ A. When and why she left ============
ALTER TABLE public.cows
  ADD COLUMN IF NOT EXISTS exit_date date,
  ADD COLUMN IF NOT EXISTS exit_reason text
    CHECK (exit_reason IS NULL OR exit_reason IN (
      'sold','died_illness','died_calving','died_accident',
      'culled_infertility','culled_yield','other')),
  ADD COLUMN IF NOT EXISTS exit_note text;

COMMENT ON COLUMN public.cows.exit_date IS
  'The day she left the herd. Without it, herd size over time cannot be '
  'charted and "when did we lose her" has no answer.';
COMMENT ON COLUMN public.cows.exit_reason IS
  'Kept to a fixed set rather than free text so a year of losses can be '
  'totted up. Not enforced against status: the three cows already marked '
  'sold predate this column and have no reason on file.';

CREATE INDEX IF NOT EXISTS idx_cows_status ON public.cows(status);

-- ============ B. Deleting a cow must not take her history with her ============
-- Every FK pointing at cows was ON DELETE CASCADE, so one accidental delete
-- removed the cow plus her breeding history, her calves, and every litre ever
-- recorded against her -- 10,189 milk_production rows, 50 ai_records and 63
-- calves across the active herd, with no undo and no audit row.
--
-- RESTRICT mirrors what the Phase 1 data-integrity migration did for
-- farmer_payouts and milk_collections: the delete fails loudly instead of
-- silently destroying the record. Nothing hard-deletes a cow after this
-- change -- the UI marks her sold or dead instead.

-- Duplicate FKs first: ai_records, vaccination_records and weight_logs each
-- carry two constraints with identical semantics, the same situation Phase 1
-- cleaned up on milk_collections. Drop the legacy fk_-prefixed one.
ALTER TABLE public.ai_records          DROP CONSTRAINT IF EXISTS fk_ai_records_cow_id;
ALTER TABLE public.vaccination_records DROP CONSTRAINT IF EXISTS fk_vaccination_records_cow_id;
ALTER TABLE public.weight_logs         DROP CONSTRAINT IF EXISTS fk_weight_logs_cow_id;

ALTER TABLE public.ai_records DROP CONSTRAINT IF EXISTS ai_records_cow_id_fkey;
ALTER TABLE public.ai_records
  ADD CONSTRAINT ai_records_cow_id_fkey
  FOREIGN KEY (cow_id) REFERENCES public.cows(id) ON DELETE RESTRICT;

ALTER TABLE public.calves DROP CONSTRAINT IF EXISTS calves_mother_cow_id_fkey;
ALTER TABLE public.calves
  ADD CONSTRAINT calves_mother_cow_id_fkey
  FOREIGN KEY (mother_cow_id) REFERENCES public.cows(id) ON DELETE RESTRICT;

ALTER TABLE public.milk_production DROP CONSTRAINT IF EXISTS milk_production_cow_id_fkey;
ALTER TABLE public.milk_production
  ADD CONSTRAINT milk_production_cow_id_fkey
  FOREIGN KEY (cow_id) REFERENCES public.cows(id) ON DELETE RESTRICT;

ALTER TABLE public.vaccination_records DROP CONSTRAINT IF EXISTS vaccination_records_cow_id_fkey;
ALTER TABLE public.vaccination_records
  ADD CONSTRAINT vaccination_records_cow_id_fkey
  FOREIGN KEY (cow_id) REFERENCES public.cows(id) ON DELETE RESTRICT;

ALTER TABLE public.weight_logs DROP CONSTRAINT IF EXISTS weight_logs_cow_id_fkey;
ALTER TABLE public.weight_logs
  ADD CONSTRAINT weight_logs_cow_id_fkey
  FOREIGN KEY (cow_id) REFERENCES public.cows(id) ON DELETE RESTRICT;

-- Group membership is the one thing that genuinely should follow the cow: it
-- is current arrangement, not history, and a group assignment for a cow who no
-- longer exists is meaningless.
ALTER TABLE public.cow_group_assignments DROP CONSTRAINT IF EXISTS cow_group_assignments_cow_id_fkey;
ALTER TABLE public.cow_group_assignments
  ADD CONSTRAINT cow_group_assignments_cow_id_fkey
  FOREIGN KEY (cow_id) REFERENCES public.cows(id) ON DELETE CASCADE;
