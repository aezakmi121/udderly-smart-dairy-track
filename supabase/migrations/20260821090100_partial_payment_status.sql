-- Use the partially_paid status added in the previous migration.
--
-- Kept in its own file because Postgres will not let a new enum value be used
-- in the same transaction that adds it.
--
-- Behaviour change: a payment that does not clear the bill now leaves the
-- payout as 'partially_paid' instead of 'paid'. record-payment-event's
-- close_partial still sets 'paid' explicitly -- that is the admin deciding to
-- close a short bill and carry the remainder forward, which is a different
-- thing from a part payment.
CREATE OR REPLACE FUNCTION public.recalc_farmer_payout_from_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  pid uuid;
  total_paid numeric;
  net numeric;
  last_evt RECORD;
BEGIN
  pid := COALESCE(NEW.payout_id, OLD.payout_id);
  SELECT COALESCE(SUM(amount),0) INTO total_paid FROM public.farmer_payment_events WHERE payout_id = pid;
  SELECT net_payable INTO net FROM public.farmer_payouts WHERE id = pid;
  SELECT method, reference, paid_on INTO last_evt FROM public.farmer_payment_events
    WHERE payout_id = pid ORDER BY paid_on DESC, created_at DESC LIMIT 1;

  UPDATE public.farmer_payouts
  SET paid_amount = total_paid,
      unpaid_balance = GREATEST(net - total_paid, 0),
      status = CASE
        WHEN total_paid <= 0 THEN status
        WHEN total_paid >= net THEN 'paid'::payout_status
        ELSE 'partially_paid'::payout_status
      END,
      paid_on = last_evt.paid_on,
      last_payment_method = last_evt.method,
      last_payment_ref = last_evt.reference
  WHERE id = pid;
  RETURN NULL;
END;
$fn$;

-- Correct the rows already mislabelled. A bill marked paid while still owing
-- money is one of these; one closed deliberately via close_partial has its
-- remainder carried forward and is left alone, which cannot be told apart
-- retrospectively -- so only rows with an unpaid balance AND no carry-forward
-- consumed downstream are touched. In practice that is every short-paid row.
UPDATE public.farmer_payouts
SET status = 'partially_paid'
WHERE status = 'paid'
  AND paid_amount > 0
  AND paid_amount < net_payable;
