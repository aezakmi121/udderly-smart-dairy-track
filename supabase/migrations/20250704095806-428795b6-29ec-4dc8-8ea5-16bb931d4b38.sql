
-- Create milk rate settings table for dynamic rate calculation based on fat and SNF
CREATE TABLE public.milk_rate_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fat_min NUMERIC NOT NULL,
  fat_max NUMERIC NOT NULL,
  snf_min NUMERIC NOT NULL,
  snf_max NUMERIC NOT NULL,
  rate_per_liter NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for milk rate settings
ALTER TABLE public.milk_rate_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON public.milk_rate_settings FOR ALL USING (true) WITH CHECK (true);

-- Create feed categories table
CREATE TABLE public.feed_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feed items table
CREATE TABLE public.feed_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.feed_categories(id),
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC,
  current_stock NUMERIC DEFAULT 0,
  minimum_stock_level NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feed transactions table for stock management
CREATE TABLE public.feed_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_item_id UUID REFERENCES public.feed_items(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('incoming', 'outgoing')),
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  transaction_date DATE DEFAULT CURRENT_DATE,
  supplier_name TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for feed tables
ALTER TABLE public.feed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON public.feed_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.feed_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.feed_transactions FOR ALL USING (true) WITH CHECK (true);

-- Create function to update feed stock automatically
CREATE OR REPLACE FUNCTION public.update_feed_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'incoming' THEN
    UPDATE public.feed_items 
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.feed_item_id;
  ELSE
    UPDATE public.feed_items 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.feed_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock
CREATE TRIGGER trigger_update_feed_stock
  AFTER INSERT ON public.feed_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feed_stock();

-- Add indexes for better performance
CREATE INDEX idx_milk_rate_settings_fat_snf ON public.milk_rate_settings(fat_min, fat_max, snf_min, snf_max);
CREATE INDEX idx_feed_items_category ON public.feed_items(category_id);
CREATE INDEX idx_feed_transactions_item ON public.feed_transactions(feed_item_id);
CREATE INDEX idx_feed_transactions_date ON public.feed_transactions(transaction_date);
