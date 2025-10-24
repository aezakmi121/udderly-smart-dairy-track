-- Create milk_distributions table for tracking daily distribution of produced milk
CREATE TABLE public.milk_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session TEXT NOT NULL CHECK (session IN ('morning', 'evening')),
  total_production NUMERIC NOT NULL DEFAULT 0,
  
  -- Fixed distribution categories
  calves NUMERIC NOT NULL DEFAULT 0,
  farm_workers NUMERIC NOT NULL DEFAULT 0,
  home NUMERIC NOT NULL DEFAULT 0,
  pradhan_ji NUMERIC NOT NULL DEFAULT 0,
  chunnu NUMERIC NOT NULL DEFAULT 0,
  store NUMERIC NOT NULL DEFAULT 0,
  cream_extraction NUMERIC NOT NULL DEFAULT 0,
  collection_center NUMERIC NOT NULL DEFAULT 0,
  
  -- Cream extraction yields
  cream_yield NUMERIC,
  ffm_yield NUMERIC,
  ffm_to_dahi NUMERIC,
  ffm_to_plant NUMERIC,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(distribution_date, session)
);

-- Create plant_sales table for tracking milk sold to plant
CREATE TABLE public.plant_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC NOT NULL,
  fat_percentage NUMERIC NOT NULL,
  snf_percentage NUMERIC,
  amount_received NUMERIC NOT NULL,
  derived_rate NUMERIC GENERATED ALWAYS AS (amount_received / NULLIF(quantity, 0)) STORED,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending')),
  payment_date DATE,
  slip_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create store_sales table for retail store revenue tracking
CREATE TABLE public.store_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash_amount NUMERIC NOT NULL DEFAULT 0,
  upi_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC GENERATED ALWAYS AS (cash_amount + upi_amount + credit_amount) STORED,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(sale_date)
);

-- Create collection_center_sales table for tracking credit-based sales
CREATE TABLE public.collection_center_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  rate_per_liter NUMERIC NOT NULL,
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * rate_per_liter) STORED,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  payment_date DATE,
  payment_month DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create cream_stock table for cream inventory management
CREATE TABLE public.cream_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('incoming', 'outgoing')),
  quantity NUMERIC NOT NULL,
  source TEXT,
  milk_distribution_id UUID REFERENCES public.milk_distributions(id),
  ghee_production_id UUID,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create ghee_production table for tracking ghee making
CREATE TABLE public.ghee_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cream_used NUMERIC NOT NULL,
  ghee_yield NUMERIC NOT NULL,
  conversion_rate NUMERIC GENERATED ALWAYS AS (ghee_yield / NULLIF(cream_used, 0) * 100) STORED,
  production_cost NUMERIC,
  batch_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create ghee_sales table for tracking ghee revenue
CREATE TABLE public.ghee_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC NOT NULL,
  rate_per_kg NUMERIC NOT NULL,
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * rate_per_kg) STORED,
  ghee_production_id UUID REFERENCES public.ghee_production(id),
  sale_type TEXT NOT NULL CHECK (sale_type IN ('store', 'direct', 'wholesale')),
  customer_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add foreign key for cream_stock to ghee_production (had to add after table creation)
ALTER TABLE public.cream_stock 
ADD CONSTRAINT fk_ghee_production 
FOREIGN KEY (ghee_production_id) 
REFERENCES public.ghee_production(id);

-- Enable RLS on all tables
ALTER TABLE public.milk_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_center_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cream_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghee_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghee_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milk_distributions (admin and worker can manage)
CREATE POLICY "Admins and workers can manage milk distributions"
ON public.milk_distributions
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- RLS Policies for plant_sales (admin and farmer/collection center can manage)
CREATE POLICY "Admins and collection center can manage plant sales"
ON public.plant_sales
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'farmer'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'farmer'));

-- RLS Policies for store_sales (admin only)
CREATE POLICY "Admins can manage store sales"
ON public.store_sales
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for collection_center_sales (admin and farmer/collection center can manage)
CREATE POLICY "Admins and collection center can manage collection center sales"
ON public.collection_center_sales
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'farmer'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'farmer'));

-- RLS Policies for cream_stock (admin and worker can manage)
CREATE POLICY "Admins and workers can manage cream stock"
ON public.cream_stock
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- RLS Policies for ghee_production (admin and worker can manage)
CREATE POLICY "Admins and workers can manage ghee production"
ON public.ghee_production
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- RLS Policies for ghee_sales (admin and farmer/collection center can view, admin can manage)
CREATE POLICY "Admins can manage ghee sales"
ON public.ghee_sales
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Collection center can view ghee sales"
ON public.ghee_sales
FOR SELECT
USING (has_role(auth.uid(), 'farmer'));

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for tables with updated_at
CREATE TRIGGER update_milk_distributions_updated_at
BEFORE UPDATE ON public.milk_distributions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plant_sales_updated_at
BEFORE UPDATE ON public.plant_sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_sales_updated_at
BEFORE UPDATE ON public.store_sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_center_sales_updated_at
BEFORE UPDATE ON public.collection_center_sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ghee_production_updated_at
BEFORE UPDATE ON public.ghee_production
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_milk_distributions_date ON public.milk_distributions(distribution_date);
CREATE INDEX idx_plant_sales_date ON public.plant_sales(sale_date);
CREATE INDEX idx_store_sales_date ON public.store_sales(sale_date);
CREATE INDEX idx_collection_center_sales_date ON public.collection_center_sales(sale_date);
CREATE INDEX idx_collection_center_sales_payment_month ON public.collection_center_sales(payment_month);
CREATE INDEX idx_cream_stock_date ON public.cream_stock(transaction_date);
CREATE INDEX idx_ghee_production_date ON public.ghee_production(production_date);
CREATE INDEX idx_ghee_sales_date ON public.ghee_sales(sale_date);