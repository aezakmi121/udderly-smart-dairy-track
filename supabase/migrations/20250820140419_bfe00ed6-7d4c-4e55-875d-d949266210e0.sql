-- Fix multiple permissive policies warnings by consolidating SELECT policies

-- Drop existing SELECT policies and create consolidated ones

-- app_settings table
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Users can read app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- farmers table
DROP POLICY IF EXISTS "Admins and workers can manage all farmers" ON public.farmers;
DROP POLICY IF EXISTS "Farmers can view farmer data" ON public.farmers;

CREATE POLICY "Users can view farmers based on role" 
ON public.farmers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'farmer'::app_role)
);

CREATE POLICY "Admins and workers can manage farmers" 
ON public.farmers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- milk_rates table
DROP POLICY IF EXISTS "Admins can manage milk rates" ON public.milk_rates;
DROP POLICY IF EXISTS "Users can view milk rates" ON public.milk_rates;

CREATE POLICY "Users can view milk rates" 
ON public.milk_rates 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage milk rates" 
ON public.milk_rates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles based on role" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  auth.uid() = id
);

-- user_roles table
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view roles based on permissions" 
ON public.user_roles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  auth.uid() = user_id
);

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- vaccination_schedules table
DROP POLICY IF EXISTS "Admins can manage vaccination schedules" ON public.vaccination_schedules;
DROP POLICY IF EXISTS "Users can view vaccination schedules" ON public.vaccination_schedules;

CREATE POLICY "Users can view vaccination schedules" 
ON public.vaccination_schedules 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage vaccination schedules" 
ON public.vaccination_schedules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));