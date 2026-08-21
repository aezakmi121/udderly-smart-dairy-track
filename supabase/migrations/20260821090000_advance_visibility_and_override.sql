-- Advances: let the admin set the deduction, and show what happened to it.
--
-- Recovery was decided entirely by generate-payout-cycle as
-- min(total outstanding, milk amount), so a 35,000 advance against a 12,000
-- fortnight bill took the whole bill and the farmer went home with nothing --
-- for as many cycles as it took. There is no policy engine here: the admin
-- types the number for the cycle, and everything else stays automatic.
--
-- The reporting side needs no new storage. finalize-payout-cycle already
-- writes one farmer_advance_recoveries row per (advance, payout), and a payout
-- knows its cycle, so "10,000 came off in 1-15 August" is a query.

-- ============ A. The one knob ============
-- NULL means "use the computed figure". A number means the admin decided.
ALTER TABLE public.farmer_payouts
  ADD COLUMN IF NOT EXISTS advances_deducted_override numeric
    CHECK (advances_deducted_override IS NULL OR advances_deducted_override >= 0),
  ADD COLUMN IF NOT EXISTS deduction_override_by uuid,
  ADD COLUMN IF NOT EXISTS deduction_override_at timestamptz;

COMMENT ON COLUMN public.farmer_payouts.advances_deducted_override IS
  'Admin-set advance deduction for this cycle. NULL = use the computed figure. '
  'generate-payout-cycle deliberately omits this column from its upsert so '
  'regenerating a draft never discards a manual decision.';

-- ============ B. The missing foreign key ============
-- farmer_payouts got one in the Phase 1 data-integrity migration and advances
-- were missed, so an advance could outlive the farmer it belongs to. RESTRICT
-- rather than CASCADE for the same reason as there: money history is not
-- something a delete should quietly take with it.
DELETE FROM public.farmer_advances a
WHERE NOT EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = a.farmer_id);

ALTER TABLE public.farmer_advances
  DROP CONSTRAINT IF EXISTS farmer_advances_farmer_id_fkey;
ALTER TABLE public.farmer_advances
  ADD CONSTRAINT farmer_advances_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.farmers(id) ON DELETE RESTRICT;

-- ============ C. Advances are the admin's business ============
-- The collection centre could read every farmer's advance balance. Nothing in
-- the centre's own screens uses it, and an advance is between the farm and the
-- farmer.
DROP POLICY IF EXISTS "CC view advances" ON public.farmer_advances;

-- ============ D. What came off last, and from where ============
-- One row per farmer carrying an outstanding advance. Derived, so it cannot
-- drift from the recoveries finalize writes.
CREATE OR REPLACE VIEW public.farmer_advance_summary
WITH (security_invoker = true) AS
WITH last_recovery AS (
  SELECT DISTINCT ON (a.farmer_id)
    a.farmer_id,
    r.amount        AS last_deducted_amount,
    r.created_at    AS last_deducted_at,
    c.cycle_start   AS last_deducted_cycle_start,
    c.cycle_end     AS last_deducted_cycle_end,
    p.bill_number   AS last_deducted_bill_number
  FROM public.farmer_advance_recoveries r
  JOIN public.farmer_advances a       ON a.id = r.advance_id
  JOIN public.farmer_payouts p        ON p.id = r.payout_id
  JOIN public.farmer_payout_cycles c  ON c.id = p.cycle_id
  ORDER BY a.farmer_id, r.created_at DESC
)
SELECT
  a.farmer_id,
  SUM(a.amount)                                   AS total_taken,
  SUM(a.amount - a.recovered_amount)              AS outstanding,
  SUM(a.recovered_amount)                         AS total_recovered,
  MAX(a.advance_date)                             AS last_advance_date,
  COUNT(*)                                        AS open_advances,
  lr.last_deducted_amount,
  lr.last_deducted_at,
  lr.last_deducted_cycle_start,
  lr.last_deducted_cycle_end,
  lr.last_deducted_bill_number
FROM public.farmer_advances a
LEFT JOIN last_recovery lr ON lr.farmer_id = a.farmer_id
WHERE a.status = 'outstanding'
  AND a.amount > a.recovered_amount
GROUP BY
  a.farmer_id, lr.last_deducted_amount, lr.last_deducted_at,
  lr.last_deducted_cycle_start, lr.last_deducted_cycle_end,
  lr.last_deducted_bill_number;

COMMENT ON VIEW public.farmer_advance_summary IS
  'Per-farmer advance position: taken, outstanding, and the most recent '
  'deduction with the cycle it came off. security_invoker so the caller''s RLS '
  'on farmer_advances applies -- which, after this migration, means admins.';

-- ============ E. A part payment is not a payment ============
-- recalc_farmer_payout_from_events resolved both branches to 'paid', so 100
-- against a 10,000 bill marked the bill paid; and because a cycle flips to
-- fully_paid once no row is non-paid, a cycle could read fully_paid with money
-- still owed. unpaid_balance was always right -- it is the status that lied.
DO $$ BEGIN
  ALTER TYPE public.payout_status ADD VALUE IF NOT EXISTS 'partially_paid' AFTER 'finalized';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ F. Keep the arithmetic in one place ============
-- Writing the override recomputes the bill, so the UI updates one column and
-- the money formula is not duplicated in the browser. Setting it back to NULL
-- returns the row to the automatic figure.
CREATE OR REPLACE FUNCTION public.apply_payout_deduction_override()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  owed numeric;
  taken numeric;
BEGIN
  IF NEW.advances_deducted_override IS NOT DISTINCT FROM OLD.advances_deducted_override THEN
    RETURN NEW;
  END IF;

  -- Once the bill is finalized its numbers are what the farmer was handed on
  -- paper, and the advances behind them have already been recovered.
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'the advance deduction can only be changed while the bill is a draft';
  END IF;

  SELECT COALESCE(SUM(amount - recovered_amount), 0) INTO owed
    FROM public.farmer_advances
   WHERE farmer_id = NEW.farmer_id AND status = 'outstanding';

  IF NEW.advances_deducted_override IS NULL THEN
    taken := LEAST(owed, NEW.total_amount);
  ELSE
    -- You cannot recover more than is left, whatever was typed.
    taken := LEAST(NEW.advances_deducted_override, owed);
    NEW.advances_deducted_override := taken;
  END IF;

  NEW.advances_deducted := taken;
  NEW.net_payable := GREATEST(
    NEW.total_amount + NEW.carry_forward_in - taken - COALESCE(NEW.other_deductions, 0), 0);
  NEW.unpaid_balance := GREATEST(NEW.net_payable - NEW.paid_amount, 0);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_payout_deduction_override ON public.farmer_payouts;
CREATE TRIGGER trg_payout_deduction_override
BEFORE UPDATE ON public.farmer_payouts
FOR EACH ROW EXECUTE FUNCTION public.apply_payout_deduction_override();
