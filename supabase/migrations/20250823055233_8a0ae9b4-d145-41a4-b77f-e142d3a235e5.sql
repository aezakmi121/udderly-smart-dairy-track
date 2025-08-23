-- Fix Auth RLS Initialization Plan issues by using (select auth.uid()) instead of auth.uid()
-- and consolidate multiple permissive policies for better performance

-- Drop existing policies that have performance issues
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can view farmers based on role" ON public.farmers;
DROP POLICY IF EXISTS "Admins and workers can manage farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admins can manage milk rates" ON public.milk_rates;
DROP POLICY IF EXISTS "Users can view milk rates" ON public.milk_rates;
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;
DROP POLICY IF EXISTS "Users can view roles based on permissions" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage vaccination schedules" ON public.vaccination_schedules;
DROP POLICY IF EXISTS "Users can view vaccination schedules" ON public.vaccination_schedules;
DROP POLICY IF EXISTS "Admins can manage breeds" ON public.breeds;
DROP POLICY IF EXISTS "Users can view breeds" ON public.breeds;

-- Create optimized policies for app_settings (consolidated into single policies)
CREATE POLICY "Optimized app settings access" 
ON public.app_settings 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  (SELECT 1)  -- Allow read access for all authenticated users
)
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- Create optimized policies for farmers (consolidated)
CREATE POLICY "Optimized farmers access" 
ON public.farmers 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  has_role((select auth.uid()), 'worker'::app_role) OR 
  has_role((select auth.uid()), 'farmer'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  has_role((select auth.uid()), 'worker'::app_role)
);

-- Create optimized policies for milk_rates (consolidated)
CREATE POLICY "Optimized milk rates access" 
ON public.milk_rates 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  (SELECT 1)  -- Allow read access for all
)
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- Create optimized policies for profiles
CREATE POLICY "Optimized profiles access" 
ON public.profiles 
FOR SELECT 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  (select auth.uid()) = id
);

CREATE POLICY "Optimized profiles update" 
ON public.profiles 
FOR UPDATE 
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Create optimized policies for user_roles (consolidated)
CREATE POLICY "Optimized user roles access" 
ON public.user_roles 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  (select auth.uid()) = user_id
)
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- Create optimized policies for vaccination_schedules (consolidated)
CREATE POLICY "Optimized vaccination schedules access" 
ON public.vaccination_schedules 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  (SELECT 1)  -- Allow read access for all
)
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- Create optimized policies for breeds (consolidated)
CREATE POLICY "Optimized breeds access" 
ON public.breeds 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  (SELECT 1)  -- Allow read access for all
)
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));