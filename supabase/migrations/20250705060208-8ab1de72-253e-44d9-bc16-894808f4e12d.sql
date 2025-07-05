
-- Add new roles to the existing app_role enum
ALTER TYPE public.app_role ADD VALUE 'delivery_boy';
ALTER TYPE public.app_role ADD VALUE 'store_manager';

-- Create delivery boys table
CREATE TABLE public.delivery_boys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  vehicle_type TEXT,
  vehicle_number TEXT,
  assigned_area TEXT,
  daily_capacity NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT NOT NULL,
  area TEXT,
  daily_quantity NUMERIC DEFAULT 0,
  delivery_time TEXT DEFAULT 'morning',
  subscription_type TEXT DEFAULT 'daily',
  rate_per_liter NUMERIC NOT NULL,
  credit_limit NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery orders table
CREATE TABLE public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date DATE DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  delivery_boy_id UUID REFERENCES public.delivery_boys(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  rate_per_liter NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, out_for_delivery, delivered, failed
  delivery_time TIMESTAMP WITH TIME ZONE,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, partial
  amount_collected NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.delivery_boys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_boys
CREATE POLICY "Admins and store managers have full access to delivery boys"
  ON public.delivery_boys
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

CREATE POLICY "Delivery boys can view their own record"
  ON public.delivery_boys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for customers
CREATE POLICY "Admins and store managers have full access to customers"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

CREATE POLICY "Delivery boys can view customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'delivery_boy'));

-- RLS policies for delivery_orders
CREATE POLICY "Admins and store managers have full access to delivery orders"
  ON public.delivery_orders
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'store_manager'));

CREATE POLICY "Delivery boys can view and update their assigned orders"
  ON public.delivery_orders
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

-- Remove the unique constraint on user_roles to allow multiple roles per user
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Create index for better performance on user_roles queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_date ON public.delivery_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON public.delivery_orders(customer_id);
