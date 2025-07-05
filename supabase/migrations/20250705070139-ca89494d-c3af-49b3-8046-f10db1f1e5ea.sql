
-- Step 1: Add enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_boy';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_manager';
