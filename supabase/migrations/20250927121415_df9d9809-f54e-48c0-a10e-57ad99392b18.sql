-- Create expense management system tables

-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense sources table
CREATE TABLE public.expense_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense status enum
CREATE TYPE public.expense_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Create main expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL,
  payment_date DATE,
  category_id UUID REFERENCES public.expense_categories(id),
  source_id UUID REFERENCES public.expense_sources(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  paid_by TEXT,
  vendor_name TEXT,
  invoice_number TEXT,
  receipt_url TEXT,
  status expense_status NOT NULL DEFAULT 'pending',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT,
  tags JSONB,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only access)
CREATE POLICY "Admins can manage expense categories" 
ON public.expense_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage expense sources" 
ON public.expense_sources 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage payment methods" 
ON public.payment_methods 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage expenses" 
ON public.expenses 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_sources_updated_at
BEFORE UPDATE ON public.expense_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', false);

-- Create storage policies for expense receipts (admin only)
CREATE POLICY "Admins can view expense receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload expense receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'expense-receipts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update expense receipts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete expense receipts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert default categories
INSERT INTO public.expense_categories (name, description) VALUES
('Feed & Nutrition', 'All feed-related expenses including concentrate, fodder, and supplements'),
('Veterinary & Healthcare', 'Medical expenses, vaccinations, treatments, and veterinary services'),
('Labor & Wages', 'Salaries, wages, and labor-related expenses'),
('Utilities', 'Electricity, water, fuel, and other utility expenses'),
('Equipment & Maintenance', 'Equipment purchases, repairs, and maintenance'),
('Milk Payouts', 'Payments to farmers for milk collection'),
('Transportation', 'Vehicle fuel, maintenance, and transportation costs'),
('Administrative', 'Office supplies, documentation, and administrative costs'),
('Insurance', 'All insurance-related expenses'),
('Other', 'Miscellaneous expenses not covered in other categories');

-- Insert default sources
INSERT INTO public.expense_sources (name, description) VALUES
('Dairy Farm', 'Main dairy farm operations'),
('Collection Center', 'Milk collection center operations'),
('Store', 'Retail store operations'),
('Processing Unit', 'Milk processing operations'),
('Transportation', 'Vehicle and transportation-related expenses'),
('Corporate Office', 'Head office and administrative expenses');

-- Insert default payment methods
INSERT INTO public.payment_methods (name) VALUES
('Cash'),
('Bank Transfer'),
('UPI'),
('Cheque'),
('Credit Card'),
('Debit Card'),
('Digital Wallet');