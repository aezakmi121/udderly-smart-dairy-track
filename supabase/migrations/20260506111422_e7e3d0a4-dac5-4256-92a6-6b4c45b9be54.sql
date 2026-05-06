
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.payout_cycle_status AS ENUM ('open','closed_for_collection','drafted','finalized','fully_paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('draft','finalized','paid','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.advance_status AS ENUM ('outstanding','recovered','written_off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash','upi','cheque','bank_transfer','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CYCLES ============
CREATE TABLE IF NOT EXISTS public.farmer_payout_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_start date NOT NULL,
  cycle_end date NOT NULL,
  half text NOT NULL CHECK (half IN ('first','second')),
  year_month text NOT NULL,
  status public.payout_cycle_status NOT NULL DEFAULT 'open',
  finalized_at timestamptz,
  finalized_by uuid,
  fully_paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_start, cycle_end)
);
CREATE INDEX IF NOT EXISTS idx_payout_cycles_status ON public.farmer_payout_cycles(status);

-- ============ PAYOUTS (BILLS) ============
CREATE TABLE IF NOT EXISTS public.farmer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.farmer_payout_cycles(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL,
  bill_number text,
  total_quantity numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  sessions_count integer NOT NULL DEFAULT 0,
  avg_fat numeric,
  avg_snf numeric,
  advances_deducted numeric NOT NULL DEFAULT 0,
  carry_forward_in numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  net_payable numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  unpaid_balance numeric NOT NULL DEFAULT 0,
  status public.payout_status NOT NULL DEFAULT 'draft',
  pdf_storage_path text,
  revision integer NOT NULL DEFAULT 1,
  notes text,
  finalized_at timestamptz,
  paid_on date,
  last_payment_method public.payment_method,
  last_payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, farmer_id)
);
CREATE INDEX IF NOT EXISTS idx_farmer_payouts_farmer ON public.farmer_payouts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payouts_status ON public.farmer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_farmer_payouts_cycle ON public.farmer_payouts(cycle_id);

-- ============ PAYMENT EVENTS ============
CREATE TABLE IF NOT EXISTS public.farmer_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.farmer_payouts(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  method public.payment_method NOT NULL,
  reference text,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  paid_by_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_payout ON public.farmer_payment_events(payout_id);

-- ============ ADVANCES ============
CREATE TABLE IF NOT EXISTS public.farmer_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL,
  advance_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL CHECK (amount > 0),
  status public.advance_status NOT NULL DEFAULT 'outstanding',
  recovered_in_payout_id uuid REFERENCES public.farmer_payouts(id) ON DELETE SET NULL,
  recovered_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advances_farmer ON public.farmer_advances(farmer_id);
CREATE INDEX IF NOT EXISTS idx_advances_status ON public.farmer_advances(status);

-- ============ OTP CODES ============
CREATE TABLE IF NOT EXISTS public.farmer_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used_at timestamptz,
  delivery_channel text NOT NULL DEFAULT 'whatsapp',
  delivery_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.farmer_otp_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_active ON public.farmer_otp_codes(phone_number, expires_at) WHERE used_at IS NULL;

-- ============ NOTIFICATIONS LOG ============
CREATE TABLE IF NOT EXISTS public.farmer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid,
  payout_id uuid REFERENCES public.farmer_payouts(id) ON DELETE SET NULL,
  channel text NOT NULL,
  template text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'queued',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_farmer ON public.farmer_notifications(farmer_id);

-- ============ AUDIT ============
CREATE TABLE IF NOT EXISTS public.farmer_payout_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid REFERENCES public.farmer_payouts(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.farmer_payout_cycles(id) ON DELETE CASCADE,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  actor_user_id uuid,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_payout ON public.farmer_payout_audit(payout_id);

-- ============ TRIGGERS ============
CREATE TRIGGER trg_farmer_payout_cycles_updated BEFORE UPDATE ON public.farmer_payout_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_farmer_payouts_updated BEFORE UPDATE ON public.farmer_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_farmer_advances_updated BEFORE UPDATE ON public.farmer_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recompute payout paid_amount/status from events
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
        ELSE 'paid'::payout_status -- partial closed = paid w/ carry-forward (manual close)
      END,
      paid_on = last_evt.paid_on,
      last_payment_method = last_evt.method,
      last_payment_ref = last_evt.reference
  WHERE id = pid;
  RETURN NULL;
END;
$fn$;

CREATE TRIGGER trg_payment_events_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.farmer_payment_events
FOR EACH ROW EXECUTE FUNCTION public.recalc_farmer_payout_from_events();

-- ============ RLS ============
ALTER TABLE public.farmer_payout_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_payout_audit ENABLE ROW LEVEL SECURITY;

-- Cycles
CREATE POLICY "Admins manage payout cycles" ON public.farmer_payout_cycles
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "CC view payout cycles" ON public.farmer_payout_cycles
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role));

-- Payouts (bills)
CREATE POLICY "Admins manage payouts" ON public.farmer_payouts
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "CC view payouts" ON public.farmer_payouts
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role));

-- Payment events: admin full; CC may insert (record cash given) and view
CREATE POLICY "Admins manage payment events" ON public.farmer_payment_events
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "CC view payment events" ON public.farmer_payment_events
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role));
CREATE POLICY "CC insert payment events" ON public.farmer_payment_events
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role));

-- Advances: admin only
CREATE POLICY "Admins manage advances" ON public.farmer_advances
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "CC view advances" ON public.farmer_advances
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role));

-- OTP codes: service role only (no policies = locked when RLS on)
-- Notifications: admin manage, CC view
CREATE POLICY "Admins manage notifications" ON public.farmer_notifications
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "CC view notifications" ON public.farmer_notifications
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role));

-- Audit: admin/CC view, inserts via SECURITY DEFINER fns only
CREATE POLICY "Admins view audit" ON public.farmer_payout_audit
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role));

-- ============ STORAGE BUCKET (private) ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('farmer-bills','farmer-bills', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read farmer bills"
ON storage.objects FOR SELECT
USING (bucket_id = 'farmer-bills' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmer'::app_role)));

CREATE POLICY "Admins write farmer bills"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'farmer-bills' AND has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins update farmer bills"
ON storage.objects FOR UPDATE
USING (bucket_id = 'farmer-bills' AND has_role(auth.uid(),'admin'::app_role));

-- ============ DEFAULT SETTINGS ============
INSERT INTO public.app_settings (key, value)
VALUES ('payout_settings', '{
  "reconciliation_days": 5,
  "auto_finalize_after_days": 7,
  "default_payment_method": "cash",
  "send_whatsapp_on_payment": true,
  "send_whatsapp_on_finalize": true,
  "currency_symbol": "\u20b9",
  "farm_name_hindi": "हमारा डेयरी फ़ार्म"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
