-- First, let's add the new payment_period column
ALTER TABLE public.expenses ADD COLUMN payment_period date;

-- Set payment_period based on existing payment_date (which currently represents the period)
-- If payment_date exists, use first day of that month, otherwise use first day of expense_date month
UPDATE public.expenses 
SET payment_period = COALESCE(
  date_trunc('month', payment_date)::date,
  date_trunc('month', expense_date)::date
);

-- Drop the old payment_date column since we're replacing it with payment_period
ALTER TABLE public.expenses DROP COLUMN payment_date;

-- Rename expense_date to payment_date (when the expense was actually paid)
ALTER TABLE public.expenses RENAME COLUMN expense_date TO payment_date;

-- Make payment_period NOT NULL since it should always have a value
ALTER TABLE public.expenses ALTER COLUMN payment_period SET NOT NULL;

-- Set default for payment_period to current month
ALTER TABLE public.expenses ALTER COLUMN payment_period SET DEFAULT date_trunc('month', CURRENT_DATE)::date;