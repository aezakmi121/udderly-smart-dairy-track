
CREATE TABLE IF NOT EXISTS public.farmer_advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  approved_advance_id uuid REFERENCES public.farmer_advances(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advance_requests_farmer ON public.farmer_advance_requests(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_advance_requests_status ON public.farmer_advance_requests(status, created_at DESC);

ALTER TABLE public.farmer_advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage advance requests"
ON public.farmer_advance_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_advance_requests_updated_at
BEFORE UPDATE ON public.farmer_advance_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.farmer_payment_events
  ADD COLUMN IF NOT EXISTS receipt_storage_path text;

ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'hi';
