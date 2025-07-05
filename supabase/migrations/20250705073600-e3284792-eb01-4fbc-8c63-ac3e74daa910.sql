
-- Create milk_schemes table for configuring different pricing schemes
CREATE TABLE IF NOT EXISTS public.milk_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_name TEXT NOT NULL,
  cow_milk_rate NUMERIC NOT NULL DEFAULT 60,
  buffalo_milk_rate NUMERIC NOT NULL DEFAULT 75,
  discount_type TEXT NOT NULL DEFAULT 'amount', -- 'amount' or 'percentage'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add scheme_id to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS scheme_id UUID REFERENCES public.milk_schemes(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS milk_type TEXT DEFAULT 'cow'; -- 'cow' or 'buffalo'

-- Enable RLS on milk_schemes
ALTER TABLE public.milk_schemes ENABLE ROW LEVEL SECURITY;

-- RLS policy for milk_schemes
CREATE POLICY "Authenticated users can view milk schemes"
  ON public.milk_schemes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and store managers can manage milk schemes"
  ON public.milk_schemes
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

-- Insert default schemes
INSERT INTO public.milk_schemes (scheme_name, cow_milk_rate, buffalo_milk_rate, discount_type, discount_value, is_active) 
VALUES 
  ('Regular Rate', 60, 75, 'amount', 0, true),
  ('Advance Payment Scheme', 60, 75, 'amount', 5, true)
ON CONFLICT DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_scheme ON public.customers(scheme_id);
