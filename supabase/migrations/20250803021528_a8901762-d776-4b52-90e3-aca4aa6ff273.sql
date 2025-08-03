-- Optimize RLS policies by wrapping auth.uid() with (select auth.uid()) to prevent re-evaluation for each row

-- Update ai_records policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to ai records" ON public.ai_records;
CREATE POLICY "Admins and farm workers have full access to ai records" 
ON public.ai_records 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update cow_group_assignments policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to cow group assignmen" ON public.cow_group_assignments;
CREATE POLICY "Admins and farm workers have full access to cow group assignments" 
ON public.cow_group_assignments 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update cow_groups policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to cow groups" ON public.cow_groups;
CREATE POLICY "Admins and farm workers have full access to cow groups" 
ON public.cow_groups 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update feed_categories policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to feed categories" ON public.feed_categories;
CREATE POLICY "Admins and farm workers have full access to feed categories" 
ON public.feed_categories 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update feed_items policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to feed items" ON public.feed_items;
CREATE POLICY "Admins and farm workers have full access to feed items" 
ON public.feed_items 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update feed_transactions policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to feed transactions" ON public.feed_transactions;
CREATE POLICY "Admins and farm workers have full access to feed transactions" 
ON public.feed_transactions 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update grouping_settings policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to grouping settings" ON public.grouping_settings;
CREATE POLICY "Admins and farm workers have full access to grouping settings" 
ON public.grouping_settings 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update milk_production policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to milk production" ON public.milk_production;
CREATE POLICY "Admins and farm workers have full access to milk production" 
ON public.milk_production 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update vaccination_records policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to vaccination records" ON public.vaccination_records;
CREATE POLICY "Admins and farm workers have full access to vaccination records" 
ON public.vaccination_records 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update weight_logs policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to weight logs" ON public.weight_logs;
CREATE POLICY "Admins and farm workers have full access to weight logs" 
ON public.weight_logs 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'worker'::app_role));

-- Update user_roles policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Combine user_roles policies to reduce multiple permissive policies
CREATE POLICY "User roles access policy" 
ON public.user_roles 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  ((select auth.uid()) = user_id)
)
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- Update farmers policies - combine multiple permissive policies
DROP POLICY IF EXISTS "Admins have full access to farmers" ON public.farmers;
DROP POLICY IF EXISTS "Collection centre can add farmers" ON public.farmers;
DROP POLICY IF EXISTS "Collection centre can view and insert farmers" ON public.farmers;

CREATE POLICY "Farmers access policy" 
ON public.farmers 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  has_role((select auth.uid()), 'worker'::app_role) OR 
  has_role((select auth.uid()), 'farmer'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  has_role((select auth.uid()), 'worker'::app_role) OR 
  has_role((select auth.uid()), 'farmer'::app_role)
);

-- Update milk_collections policies - combine multiple permissive policies
DROP POLICY IF EXISTS "Admins have full access to milk collections" ON public.milk_collections;
DROP POLICY IF EXISTS "Collection centre can insert milk collections" ON public.milk_collections;
DROP POLICY IF EXISTS "Farm workers can view milk collections" ON public.milk_collections;

CREATE POLICY "Milk collections access policy" 
ON public.milk_collections 
FOR ALL 
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  has_role((select auth.uid()), 'worker'::app_role) OR 
  has_role((select auth.uid()), 'farmer'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role) OR 
  has_role((select auth.uid()), 'worker'::app_role) OR 
  has_role((select auth.uid()), 'farmer'::app_role)
);

-- Update profiles policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING ((select auth.uid()) = id);