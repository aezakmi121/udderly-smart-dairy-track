
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE gender AS ENUM ('male', 'female');
CREATE TYPE session_type AS ENUM ('morning', 'evening');
CREATE TYPE ai_status AS ENUM ('pending', 'done', 'failed');
CREATE TYPE pd_result AS ENUM ('positive', 'negative', 'inconclusive');
CREATE TYPE calf_status AS ENUM ('alive', 'dead', 'sold');
CREATE TYPE cow_status AS ENUM ('active', 'dry', 'pregnant', 'sick', 'sold', 'dead');
CREATE TYPE transaction_type AS ENUM ('incoming', 'outgoing');
CREATE TYPE app_role AS ENUM ('admin', 'farmer', 'worker');

-- User profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role app_role DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Cows table
CREATE TABLE public.cows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cow_number TEXT NOT NULL UNIQUE,
  image_url TEXT,
  date_of_arrival DATE NOT NULL,
  breed TEXT,
  estimated_milk_capacity DECIMAL(10,2),
  date_of_birth DATE,
  purchase_price DECIMAL(10,2),
  status cow_status DEFAULT 'active',
  last_calving_date DATE,
  lactation_number INTEGER DEFAULT 1,
  lifetime_yield DECIMAL(12,2) DEFAULT 0,
  peak_yield DECIMAL(8,2) DEFAULT 0,
  current_month_yield DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calves table
CREATE TABLE public.calves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calf_number TEXT UNIQUE, -- Only for females
  mother_cow_id UUID REFERENCES public.cows(id) ON DELETE CASCADE,
  image_url TEXT,
  date_of_birth DATE NOT NULL,
  date_of_conception DATE,
  gender gender NOT NULL,
  breed TEXT,
  birth_weight DECIMAL(6,2),
  status calf_status DEFAULT 'alive',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weight logs table
CREATE TABLE public.weight_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cow_id UUID REFERENCES public.cows(id) ON DELETE CASCADE,
  heart_girth DECIMAL(6,2) NOT NULL,
  body_length DECIMAL(6,2) NOT NULL,
  calculated_weight DECIMAL(8,2) NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vaccination schedules (preset vaccines)
CREATE TABLE public.vaccination_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vaccine_name TEXT NOT NULL,
  description TEXT,
  frequency_months INTEGER NOT NULL, -- e.g., 3 for deworming, 12 for FMD
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vaccination records
CREATE TABLE public.vaccination_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cow_id UUID REFERENCES public.cows(id) ON DELETE CASCADE,
  vaccination_schedule_id UUID REFERENCES public.vaccination_schedules(id),
  vaccination_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  batch_number TEXT,
  administered_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milk production records
CREATE TABLE public.milk_production (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cow_id UUID REFERENCES public.cows(id) ON DELETE CASCADE,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session session_type NOT NULL,
  quantity DECIMAL(8,2) NOT NULL,
  fat_percentage DECIMAL(5,2),
  snf_percentage DECIMAL(5,2),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cow_id, production_date, session)
);

-- Farmers table (for milk collection)
CREATE TABLE public.farmers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  farmer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milk rate table (based on fat and SNF)
CREATE TABLE public.milk_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fat_min DECIMAL(5,2) NOT NULL,
  fat_max DECIMAL(5,2) NOT NULL,
  snf_min DECIMAL(5,2) NOT NULL,
  snf_max DECIMAL(5,2) NOT NULL,
  rate_per_liter DECIMAL(8,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milk collection records
CREATE TABLE public.milk_collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session session_type NOT NULL,
  quantity DECIMAL(8,2) NOT NULL,
  fat_percentage DECIMAL(5,2) NOT NULL,
  snf_percentage DECIMAL(5,2) NOT NULL,
  rate_per_liter DECIMAL(8,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  is_accepted BOOLEAN DEFAULT TRUE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed categories
CREATE TABLE public.feed_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed items
CREATE TABLE public.feed_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES public.feed_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- kg, liters, etc.
  cost_per_unit DECIMAL(10,2),
  minimum_stock_level DECIMAL(10,2) DEFAULT 0,
  current_stock DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed transactions (incoming/outgoing)
CREATE TABLE public.feed_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feed_item_id UUID REFERENCES public.feed_items(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI (Artificial Insemination) records
CREATE TABLE public.ai_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cow_id UUID REFERENCES public.cows(id) ON DELETE CASCADE,
  service_number INTEGER NOT NULL DEFAULT 1,
  ai_date DATE NOT NULL,
  ai_status ai_status DEFAULT 'done',
  semen_batch TEXT,
  technician_name TEXT,
  pd_date DATE, -- Pregnancy detection date (suggested 3 months after AI)
  pd_done BOOLEAN DEFAULT FALSE,
  pd_result pd_result,
  confirmation_date DATE,
  expected_delivery_date DATE, -- 285 days after AI date
  actual_delivery_date DATE,
  calf_gender gender,
  calf_id UUID REFERENCES public.calves(id),
  is_successful BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view all records" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view cows" ON public.cows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cows" ON public.cows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cows" ON public.cows FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cows" ON public.cows FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view calves" ON public.calves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert calves" ON public.calves FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update calves" ON public.calves FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete calves" ON public.calves FOR DELETE TO authenticated USING (true);

-- Apply similar policies to all tables
CREATE POLICY "Authenticated users full access" ON public.weight_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.vaccination_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.vaccination_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.milk_production FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.farmers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.milk_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.milk_collections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.feed_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.feed_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.feed_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.ai_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone_number');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default vaccination schedules
INSERT INTO public.vaccination_schedules (vaccine_name, description, frequency_months) VALUES
('Deworming', 'Regular deworming for parasites', 3),
('FMD Vaccine', 'Foot and Mouth Disease vaccination', 12),
('Brucellosis', 'Brucella abortus vaccination', 12),
('Blackleg', 'Clostridial disease prevention', 6),
('Anthrax', 'Bacillus anthracis vaccination', 12);

-- Insert default feed categories
INSERT INTO public.feed_categories (name, description) VALUES
('Concentrates', 'High energy feeds like grains'),
('Roughages', 'Hay, silage, and fodder'),
('Supplements', 'Vitamins and minerals'),
('By-products', 'Industrial by-products like oil cakes');

-- Insert default milk rates (example rates)
INSERT INTO public.milk_rates (fat_min, fat_max, snf_min, snf_max, rate_per_liter) VALUES
(3.0, 3.5, 8.0, 8.5, 35.00),
(3.5, 4.0, 8.5, 9.0, 38.00),
(4.0, 4.5, 9.0, 9.5, 42.00),
(4.5, 5.0, 9.5, 10.0, 45.00);

-- Create function to calculate days in milk
CREATE OR REPLACE FUNCTION public.calculate_days_in_milk(cow_id UUID)
RETURNS INTEGER AS $$
DECLARE
  last_calving DATE;
BEGIN
  SELECT last_calving_date INTO last_calving 
  FROM public.cows 
  WHERE id = cow_id;
  
  IF last_calving IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN CURRENT_DATE - last_calving;
END;
$$ LANGUAGE plpgsql;

-- Create function to update cow totals
CREATE OR REPLACE FUNCTION public.update_cow_milk_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current month yield
  UPDATE public.cows SET 
    current_month_yield = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM public.milk_production 
      WHERE cow_id = NEW.cow_id 
      AND DATE_TRUNC('month', production_date) = DATE_TRUNC('month', CURRENT_DATE)
    ),
    lifetime_yield = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM public.milk_production 
      WHERE cow_id = NEW.cow_id
    ),
    updated_at = NOW()
  WHERE id = NEW.cow_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update cow totals on milk production insert/update
CREATE TRIGGER update_cow_totals_trigger
  AFTER INSERT OR UPDATE ON public.milk_production
  FOR EACH ROW EXECUTE FUNCTION public.update_cow_milk_totals();

-- Create function to update feed stock levels
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

-- Create trigger to update feed stock on transactions
CREATE TRIGGER update_feed_stock_trigger
  AFTER INSERT ON public.feed_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_feed_stock();
