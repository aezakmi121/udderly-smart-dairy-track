
-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. bank_accounts
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_name text NOT NULL,
  last4 text,
  source_id uuid REFERENCES public.expense_sources(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bank_accounts" ON public.bank_accounts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_bank_accounts_updated
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. statement_imports
CREATE TABLE public.statement_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  file_url text,
  status text NOT NULL DEFAULT 'parsing', -- parsing | review | approved | failed
  txn_count integer NOT NULL DEFAULT 0,
  total_debits numeric NOT NULL DEFAULT 0,
  period_from date,
  period_to date,
  uploaded_by uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage statement_imports" ON public.statement_imports
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_statement_imports_status ON public.statement_imports(status, created_at DESC);

CREATE TRIGGER trg_statement_imports_updated
  BEFORE UPDATE ON public.statement_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. statement_transactions
CREATE TABLE public.statement_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.statement_imports(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  narration text NOT NULL,
  ref_no text,
  amount numeric NOT NULL,
  suggested_category_id uuid REFERENCES public.expense_categories(id),
  suggested_payment_method_id uuid REFERENCES public.payment_methods(id),
  suggested_vendor text,
  confidence numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | skipped
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.statement_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage statement_transactions" ON public.statement_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_statement_txns_import ON public.statement_transactions(import_id, status);
CREATE UNIQUE INDEX idx_statement_txns_dedup
  ON public.statement_transactions(bank_account_id, ref_no)
  WHERE ref_no IS NOT NULL;

CREATE TRIGGER trg_statement_txns_updated
  BEFORE UPDATE ON public.statement_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-statements', 'bank-statements', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read bank statements" ON storage.objects
  FOR SELECT USING (bucket_id = 'bank-statements' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload bank statements" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bank-statements' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update bank statements" ON storage.objects
  FOR UPDATE USING (bucket_id = 'bank-statements' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete bank statements" ON storage.objects
  FOR DELETE USING (bucket_id = 'bank-statements' AND has_role(auth.uid(), 'admin'::app_role));

-- 5. Cron jobs for digests (UTC)
SELECT cron.schedule(
  'expense-digest-daily',
  '0 16 * * *',
  $$ SELECT net.http_post(
    url := 'https://gjimccbtclynetngfrpw.supabase.co/functions/v1/send-expense-digest',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaW1jY2J0Y2x5bmV0bmdmcnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTU2NTQsImV4cCI6MjA2NzE5MTY1NH0.IhCGLeAp7fahlEvWt5BnpIEfpbm6T-vHjilv8S5OuFg"}'::jsonb,
    body := '{"period":"daily"}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'expense-digest-weekly',
  '30 2 * * 1',
  $$ SELECT net.http_post(
    url := 'https://gjimccbtclynetngfrpw.supabase.co/functions/v1/send-expense-digest',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaW1jY2J0Y2x5bmV0bmdmcnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTU2NTQsImV4cCI6MjA2NzE5MTY1NH0.IhCGLeAp7fahlEvWt5BnpIEfpbm6T-vHjilv8S5OuFg"}'::jsonb,
    body := '{"period":"weekly"}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'expense-digest-monthly',
  '30 2 1 * *',
  $$ SELECT net.http_post(
    url := 'https://gjimccbtclynetngfrpw.supabase.co/functions/v1/send-expense-digest',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaW1jY2J0Y2x5bmV0bmdmcnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTU2NTQsImV4cCI6MjA2NzE5MTY1NH0.IhCGLeAp7fahlEvWt5BnpIEfpbm6T-vHjilv8S5OuFg"}'::jsonb,
    body := '{"period":"monthly"}'::jsonb
  ); $$
);
