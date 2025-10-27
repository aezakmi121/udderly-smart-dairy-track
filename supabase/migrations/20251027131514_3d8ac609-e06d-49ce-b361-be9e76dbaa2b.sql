-- Add mixing field to milk_distributions
ALTER TABLE milk_distributions 
ADD COLUMN mixing numeric NOT NULL DEFAULT 0;

-- Create collection_center_distributions table
CREATE TABLE collection_center_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_date date NOT NULL DEFAULT CURRENT_DATE,
  session text NOT NULL CHECK (session IN ('morning', 'evening')),
  
  -- Cow milk from collection center
  cow_to_store numeric NOT NULL DEFAULT 0,
  cow_to_plant numeric NOT NULL DEFAULT 0,
  cow_to_farm_cream numeric NOT NULL DEFAULT 0,
  
  -- Buffalo milk
  buffalo_to_store numeric NOT NULL DEFAULT 0,
  buffalo_to_plant numeric NOT NULL DEFAULT 0,
  
  -- Cash sales (farmer code 2 only)
  cash_sale numeric NOT NULL DEFAULT 0,
  
  -- Mixing (cow milk mixed with buffalo)
  mixing numeric NOT NULL DEFAULT 0,
  
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE collection_center_distributions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and workers can manage collection center distributions"
ON collection_center_distributions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- Create store_receipts table
CREATE TABLE store_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Cow milk received
  cow_received numeric NOT NULL DEFAULT 0,
  
  -- Buffalo milk received
  buffalo_received numeric NOT NULL DEFAULT 0,
  
  -- Mixed milk received (from collection center)
  mixed_received numeric NOT NULL DEFAULT 0,
  
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE store_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and workers can manage store receipts"
ON store_receipts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- Create slip_verification table
CREATE TABLE slip_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_date date NOT NULL DEFAULT CURRENT_DATE,
  session text NOT NULL CHECK (session IN ('morning', 'evening')),
  farmer_id uuid REFERENCES farmers(id),
  
  -- Recorded quantity vs slip quantity
  recorded_quantity numeric NOT NULL,
  slip_quantity numeric NOT NULL,
  difference numeric GENERATED ALWAYS AS (recorded_quantity - slip_quantity) STORED,
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'discrepancy')),
  
  -- Admin notes
  admin_notes text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE slip_verification ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and workers can manage slip verification"
ON slip_verification
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- Create dahi_production table
CREATE TABLE dahi_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  batch_number text,
  
  -- FFM used for dahi
  ffm_used numeric NOT NULL,
  
  -- Dahi yield
  dahi_yield numeric NOT NULL,
  
  -- Conversion rate (dahi_yield / ffm_used)
  conversion_rate numeric GENERATED ALWAYS AS (
    CASE 
      WHEN ffm_used > 0 THEN ROUND(dahi_yield / ffm_used, 4)
      ELSE 0
    END
  ) STORED,
  
  -- Cost calculation
  production_cost numeric,
  cost_per_kg numeric GENERATED ALWAYS AS (
    CASE 
      WHEN dahi_yield > 0 THEN ROUND(production_cost / dahi_yield, 2)
      ELSE 0
    END
  ) STORED,
  
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE dahi_production ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and workers can manage dahi production"
ON dahi_production
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_collection_center_distributions_updated_at
BEFORE UPDATE ON collection_center_distributions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_receipts_updated_at
BEFORE UPDATE ON store_receipts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slip_verification_updated_at
BEFORE UPDATE ON slip_verification
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dahi_production_updated_at
BEFORE UPDATE ON dahi_production
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();