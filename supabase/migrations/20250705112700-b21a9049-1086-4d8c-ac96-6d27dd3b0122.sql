
-- Add products table for POS system (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.pos_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'piece',
  fractional_allowed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add product variants table
CREATE TABLE IF NOT EXISTS public.pos_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.pos_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  cost_price NUMERIC,
  selling_price NUMERIC NOT NULL,
  stock_quantity NUMERIC DEFAULT 0,
  low_stock_alert NUMERIC DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create scheme product discounts table to link schemes with products
CREATE TABLE IF NOT EXISTS public.scheme_product_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID REFERENCES public.milk_schemes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.pos_products(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'amount'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(scheme_id, product_id)
);

-- Enable RLS on new tables
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_product_discounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for pos_products
CREATE POLICY "Authenticated users can view pos products"
  ON public.pos_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and store managers can manage pos products"
  ON public.pos_products
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

-- RLS policies for pos_product_variants
CREATE POLICY "Authenticated users can view pos product variants"
  ON public.pos_product_variants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and store managers can manage pos product variants"
  ON public.pos_product_variants
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

-- RLS policies for scheme_product_discounts
CREATE POLICY "Authenticated users can view scheme product discounts"
  ON public.scheme_product_discounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and store managers can manage scheme product discounts"
  ON public.scheme_product_discounts
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheme_product_discounts_scheme ON public.scheme_product_discounts(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_product_discounts_product ON public.scheme_product_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_product_variants_product ON public.pos_product_variants(product_id);
