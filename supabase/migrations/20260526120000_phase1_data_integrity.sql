-- Phase 1: data integrity — UNIQUE phone, missing FK, RESTRICT cascades, UNIQUE payouts

-- Pre-flight (verified against the live DB at write time, gjimccbtclynetngfrpw):
--   - 0 duplicate non-empty phone numbers in farmers (27 with phone, 32 NULL/empty)
--   - 0 orphans in farmer_payouts.farmer_id pointing at deleted farmers
--   - 0 duplicate (cycle_id, farmer_id) tuples in farmer_payouts
--   - 0 orphan milk_collections
-- These checks must pass before the migration deploys to any environment.

-- A. Partial UNIQUE on farmers.phone_number.
--    A plain UNIQUE would block multiple farmers without a phone (NULL/empty).
--    The partial predicate enforces uniqueness only on real phone numbers,
--    matching the OTP flow's 1:1 assumption.
CREATE UNIQUE INDEX IF NOT EXISTS idx_farmers_phone_number_unique
  ON public.farmers (phone_number)
  WHERE phone_number IS NOT NULL AND phone_number <> '';

-- B. Add missing FK farmer_payouts.farmer_id → farmers.id.
--    The column was declared uuid NOT NULL without a REFERENCES clause, so
--    referential integrity was never enforced. RESTRICT mirrors the rest of
--    this migration: a farmer with payouts cannot be hard-deleted; use
--    is_active = false instead.
ALTER TABLE public.farmer_payouts
  DROP CONSTRAINT IF EXISTS farmer_payouts_farmer_id_fkey;
ALTER TABLE public.farmer_payouts
  ADD CONSTRAINT farmer_payouts_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.farmers(id) ON DELETE RESTRICT;

-- C. Drop the duplicate FK on milk_collections.farmer_id.
--    pg_constraint shows two FKs with identical semantics
--    (fk_milk_collections_farmer_id and milk_collections_farmer_id_fkey).
--    Keep the canonical _fkey-named one; drop the legacy duplicate.
ALTER TABLE public.milk_collections
  DROP CONSTRAINT IF EXISTS fk_milk_collections_farmer_id;

-- D. Flip CASCADE → RESTRICT on FKs that, if cascaded, destroy financial
--    history. Deleting a farmer, cycle, or payout will now fail loudly
--    rather than silently nuking the audit trail. The UI never hard-deletes
--    these rows today (farmer deactivation uses is_active = false).
ALTER TABLE public.milk_collections
  DROP CONSTRAINT milk_collections_farmer_id_fkey;
ALTER TABLE public.milk_collections
  ADD CONSTRAINT milk_collections_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.farmers(id) ON DELETE RESTRICT;

ALTER TABLE public.farmer_payouts
  DROP CONSTRAINT farmer_payouts_cycle_id_fkey;
ALTER TABLE public.farmer_payouts
  ADD CONSTRAINT farmer_payouts_cycle_id_fkey
  FOREIGN KEY (cycle_id) REFERENCES public.farmer_payout_cycles(id) ON DELETE RESTRICT;

ALTER TABLE public.farmer_payment_events
  DROP CONSTRAINT farmer_payment_events_payout_id_fkey;
ALTER TABLE public.farmer_payment_events
  ADD CONSTRAINT farmer_payment_events_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES public.farmer_payouts(id) ON DELETE RESTRICT;

ALTER TABLE public.farmer_payout_audit
  DROP CONSTRAINT farmer_payout_audit_payout_id_fkey;
ALTER TABLE public.farmer_payout_audit
  ADD CONSTRAINT farmer_payout_audit_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES public.farmer_payouts(id) ON DELETE RESTRICT;

ALTER TABLE public.farmer_payout_audit
  DROP CONSTRAINT farmer_payout_audit_cycle_id_fkey;
ALTER TABLE public.farmer_payout_audit
  ADD CONSTRAINT farmer_payout_audit_cycle_id_fkey
  FOREIGN KEY (cycle_id) REFERENCES public.farmer_payout_cycles(id) ON DELETE RESTRICT;

-- E. UNIQUE (cycle_id, farmer_id) on farmer_payouts.
--    generate-payout-cycle does an upsert with onConflict: 'cycle_id,farmer_id'
--    but the schema never enforced that uniqueness, so the upsert behaviour
--    was implementation-defined and a re-run could in principle have
--    duplicated rows. Verified 0 existing duplicates before applying.
ALTER TABLE public.farmer_payouts
  DROP CONSTRAINT IF EXISTS farmer_payouts_cycle_id_farmer_id_key;
ALTER TABLE public.farmer_payouts
  ADD CONSTRAINT farmer_payouts_cycle_id_farmer_id_key UNIQUE (cycle_id, farmer_id);
