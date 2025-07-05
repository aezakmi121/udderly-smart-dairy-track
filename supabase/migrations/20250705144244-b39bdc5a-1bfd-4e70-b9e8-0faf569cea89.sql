
-- Add customer allocation table to track which customers are assigned to which delivery boys
CREATE TABLE IF NOT EXISTS public.customer_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  delivery_boy_id UUID REFERENCES public.delivery_boys(id) ON DELETE CASCADE,
  allocated_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  allocated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_id, delivery_boy_id, allocated_date)
);

-- Add daily delivery records table to track actual deliveries
CREATE TABLE IF NOT EXISTS public.daily_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  delivery_boy_id UUID REFERENCES public.delivery_boys(id) ON DELETE CASCADE,
  scheduled_quantity NUMERIC NOT NULL DEFAULT 0,
  actual_quantity NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, delivered, not_taken, partial
  notes TEXT,
  rate_per_liter NUMERIC NOT NULL,
  total_amount NUMERIC GENERATED ALWAYS AS (actual_quantity * rate_per_liter) STORED,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.customer_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_allocations
CREATE POLICY "Admins and store managers can manage customer allocations"
  ON public.customer_allocations
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

CREATE POLICY "Delivery boys can view their customer allocations"
  ON public.customer_allocations
  FOR SELECT
  TO authenticated
  USING (
    delivery_boy_id IN (
      SELECT id FROM public.delivery_boys WHERE user_id = auth.uid()
    )
  );

-- RLS policies for daily_deliveries
CREATE POLICY "Admins and store managers have full access to daily deliveries"
  ON public.daily_deliveries
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

CREATE POLICY "Delivery boys can manage their own deliveries"
  ON public.daily_deliveries
  FOR ALL
  TO authenticated
  USING (
    delivery_boy_id IN (
      SELECT id FROM public.delivery_boys WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    delivery_boy_id IN (
      SELECT id FROM public.delivery_boys WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_allocations_delivery_boy ON public.customer_allocations(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_customer_allocations_customer ON public.customer_allocations(customer_id);
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_date ON public.daily_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_delivery_boy ON public.daily_deliveries(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_customer ON public.daily_deliveries(customer_id);

-- Function to automatically create daily deliveries based on customer allocations
CREATE OR REPLACE FUNCTION public.create_daily_deliveries_for_date(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  record_count INTEGER := 0;
BEGIN
  INSERT INTO public.daily_deliveries (
    delivery_date,
    customer_id,
    delivery_boy_id,
    scheduled_quantity,
    rate_per_liter
  )
  SELECT 
    target_date,
    ca.customer_id,
    ca.delivery_boy_id,
    c.daily_quantity,
    c.rate_per_liter
  FROM public.customer_allocations ca
  JOIN public.customers c ON ca.customer_id = c.id
  WHERE ca.is_active = true
    AND c.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_deliveries dd 
      WHERE dd.delivery_date = target_date 
        AND dd.customer_id = ca.customer_id 
        AND dd.delivery_boy_id = ca.delivery_boy_id
    );
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  RETURN record_count;
END;
$$;
