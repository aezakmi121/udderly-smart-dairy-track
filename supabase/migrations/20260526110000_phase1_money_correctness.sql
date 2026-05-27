-- Phase 1: money correctness — idempotency for payments + advance recovery audit trail

-- A. Idempotency key on payment events.
--    Client generates a UUID per dialog open; record-payment-event and
--    bulk-record-payments dedup on this key so network retries do not
--    create duplicate payment rows. Existing rows have NULL (partial unique
--    index ignores them).
ALTER TABLE public.farmer_payment_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_idempotency_key
  ON public.farmer_payment_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- B. Audit table for advance recoveries.
--    farmer_advances.recovered_in_payout_id only stores the LAST payout that
--    recovered from a given advance — history is lost when an advance is
--    recovered across multiple cycles. This table records every
--    (advance, payout) recovery event, enabling idempotent re-runs of
--    finalize-payout-cycle and an accurate per-cycle audit trail.
--    Historical recoveries (before this migration) are not backfilled.
CREATE TABLE IF NOT EXISTS public.farmer_advance_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id uuid NOT NULL REFERENCES public.farmer_advances(id) ON DELETE RESTRICT,
  payout_id uuid NOT NULL REFERENCES public.farmer_payouts(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advance_id, payout_id)
);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_advance ON public.farmer_advance_recoveries(advance_id);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_payout ON public.farmer_advance_recoveries(payout_id);

ALTER TABLE public.farmer_advance_recoveries ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS for the edge functions that write to this table.
CREATE POLICY "Admins read advance recoveries"
  ON public.farmer_advance_recoveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
