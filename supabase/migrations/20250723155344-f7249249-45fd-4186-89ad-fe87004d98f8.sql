-- Remove unused tables that are not part of the core dairy management system
DROP TABLE IF EXISTS public.pos_product_variants CASCADE;
DROP TABLE IF EXISTS public.pos_products CASCADE;
DROP TABLE IF EXISTS public.delivery_boys CASCADE;
DROP TABLE IF EXISTS public.daily_deliveries CASCADE;
DROP TABLE IF EXISTS public.customer_credit_transactions CASCADE;
DROP TABLE IF EXISTS public.customer_allocations CASCADE;
DROP TABLE IF EXISTS public.delivery_orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- Fix the user roles constraint issue by dropping and recreating with proper constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Create a proper unique constraint that allows multiple roles per user but not duplicate role assignments
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);

-- Update the handle_new_user function to fix the signup error
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone_number');
  
  -- Assign default worker role only if not already exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'worker')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;