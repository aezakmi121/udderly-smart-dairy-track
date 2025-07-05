
-- Drop the scheme_product_discounts table
DROP TABLE IF EXISTS public.scheme_product_discounts CASCADE;

-- Drop the milk_schemes table
DROP TABLE IF EXISTS public.milk_schemes CASCADE;

-- Remove the scheme_id column from customers table
ALTER TABLE public.customers DROP COLUMN IF EXISTS scheme_id;

-- Remove the milk_type column from customers table  
ALTER TABLE public.customers DROP COLUMN IF EXISTS milk_type;
