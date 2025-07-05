
-- Add credit tracking fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS current_credit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Create table for customer credit transactions
CREATE TABLE IF NOT EXISTS public.customer_credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_sale', 'payment', 'adjustment')),
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID, -- For linking to delivery orders or other transactions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on customer credit transactions
ALTER TABLE public.customer_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for customer credit transactions
CREATE POLICY "Admins and store managers can manage credit transactions"
ON public.customer_credit_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'store_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'store_manager'::app_role));

-- Add unique constraint on phone number to prevent duplicates
ALTER TABLE public.customers 
ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- Create function to update customer credit
CREATE OR REPLACE FUNCTION update_customer_credit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer's current credit based on transaction type
  IF NEW.transaction_type = 'credit_sale' THEN
    UPDATE customers 
    SET current_credit = current_credit + NEW.amount 
    WHERE id = NEW.customer_id;
  ELSIF NEW.transaction_type = 'payment' THEN
    UPDATE customers 
    SET current_credit = current_credit - NEW.amount,
        last_payment_date = CURRENT_DATE
    WHERE id = NEW.customer_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE customers 
    SET current_credit = current_credit + NEW.amount 
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update customer credit
CREATE TRIGGER trigger_update_customer_credit
AFTER INSERT ON customer_credit_transactions
FOR EACH ROW EXECUTE FUNCTION update_customer_credit();
