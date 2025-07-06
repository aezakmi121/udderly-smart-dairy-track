
-- Remove POS system tables
DROP TABLE IF EXISTS public.pos_product_variants CASCADE;
DROP TABLE IF EXISTS public.pos_products CASCADE;

-- Remove customer and delivery management tables
DROP TABLE IF EXISTS public.customer_credit_transactions CASCADE;
DROP TABLE IF EXISTS public.customer_allocations CASCADE;
DROP TABLE IF EXISTS public.daily_deliveries CASCADE;
DROP TABLE IF EXISTS public.delivery_orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.delivery_boys CASCADE;

-- Remove related app_role enum values (we'll recreate the enum with only dairy roles)
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'worker', 'farmer');

-- Update user_roles table to use the new enum
-- First update any existing roles that are no longer valid
UPDATE public.user_roles 
SET role = 'worker' 
WHERE role IN ('delivery_boy', 'store_manager');

-- Remove the database function that's no longer needed
DROP FUNCTION IF EXISTS public.create_daily_deliveries_for_date(date);

-- Remove the trigger function for customer credit updates
DROP FUNCTION IF EXISTS public.update_customer_credit() CASCADE;
