-- A calf settles the question of whether she was pregnant.
--
-- Seven records claim a calving and a negative PD at the same time. Both
-- delivery flows wrote the calving date and left the PD alone, so a check made
-- too early -- or simply called wrong -- stayed on the record forever. Anything
-- counting pregnancies from pd_result has been undercounting by those seven.
--
-- The application now writes pd_done and pd_result alongside the calving. This
-- corrects the rows already in that state and stops any other route recreating
-- them.

UPDATE public.ai_records
SET pd_done = true,
    pd_result = 'positive'
WHERE actual_delivery_date IS NOT NULL
  AND (pd_result IS DISTINCT FROM 'positive' OR pd_done IS DISTINCT FROM true);

-- Written as NOT VALID first so the constraint applies to everything from here
-- on without the migration failing should any row have been missed above; the
-- validation immediately after is what proves none were.
ALTER TABLE public.ai_records
  DROP CONSTRAINT IF EXISTS ai_records_delivery_implies_pregnancy;

ALTER TABLE public.ai_records
  ADD CONSTRAINT ai_records_delivery_implies_pregnancy
  CHECK (
    actual_delivery_date IS NULL
    OR (pd_done IS TRUE AND pd_result = 'positive')
  ) NOT VALID;

ALTER TABLE public.ai_records
  VALIDATE CONSTRAINT ai_records_delivery_implies_pregnancy;

COMMENT ON CONSTRAINT ai_records_delivery_implies_pregnancy ON public.ai_records IS
  'A recorded calving means the PD was positive, whatever was entered at the time.';
