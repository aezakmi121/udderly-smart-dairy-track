-- Fix all Auth RLS Initialization Plan warnings by wrapping auth functions in SELECT statements
-- This prevents re-evaluation of auth functions for each row, improving performance significantly

-- Fix all existing RLS policies that use auth.uid() directly

-- 1. Fix app_settings policies
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Anyone can read app settings" 
ON public.app_settings 
FOR SELECT 
TO authenticated
USING (true);

-- 2. Fix calves policies
DROP POLICY IF EXISTS "Admins and workers can manage calves" ON public.calves;

CREATE POLICY "Admins and workers can manage calves" 
ON public.calves 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 3. Fix cows policies
DROP POLICY IF EXISTS "Admins and workers can manage cows" ON public.cows;

CREATE POLICY "Admins and workers can manage cows" 
ON public.cows 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 4. Fix AI records policies
DROP POLICY IF EXISTS "Admins and workers can manage ai records" ON public.ai_records;

CREATE POLICY "Admins and workers can manage ai records" 
ON public.ai_records 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 5. Fix cow group assignments policies
DROP POLICY IF EXISTS "Admins and workers can manage cow group assignments" ON public.cow_group_assignments;

CREATE POLICY "Admins and workers can manage cow group assignments" 
ON public.cow_group_assignments 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 6. Fix cow groups policies
DROP POLICY IF EXISTS "Admins and workers can manage cow groups" ON public.cow_groups;

CREATE POLICY "Admins and workers can manage cow groups" 
ON public.cow_groups 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 7. Fix farmers policies
DROP POLICY IF EXISTS "Admins and workers can manage all farmers" ON public.farmers;
DROP POLICY IF EXISTS "Farmers can view farmer data" ON public.farmers;

CREATE POLICY "Admins and workers can manage all farmers" 
ON public.farmers 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

CREATE POLICY "Farmers can view farmer data" 
ON public.farmers 
FOR SELECT
TO authenticated
USING (has_role((SELECT auth.uid()), 'farmer'::app_role));

-- 8. Fix feed categories policies
DROP POLICY IF EXISTS "Admins and workers can manage feed categories" ON public.feed_categories;

CREATE POLICY "Admins and workers can manage feed categories" 
ON public.feed_categories 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 9. Fix feed items policies
DROP POLICY IF EXISTS "Admins and workers can manage feed items" ON public.feed_items;

CREATE POLICY "Admins and workers can manage feed items" 
ON public.feed_items 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 10. Fix feed transactions policies
DROP POLICY IF EXISTS "Admins and workers can manage feed transactions" ON public.feed_transactions;

CREATE POLICY "Admins and workers can manage feed transactions" 
ON public.feed_transactions 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 11. Fix grouping settings policies
DROP POLICY IF EXISTS "Admins and workers can manage grouping settings" ON public.grouping_settings;

CREATE POLICY "Admins and workers can manage grouping settings" 
ON public.grouping_settings 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 12. Fix invitations policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;

CREATE POLICY "Admins can manage invitations" 
ON public.invitations 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- 13. Fix milk collections policies
DROP POLICY IF EXISTS "Users can manage milk collections based on role" ON public.milk_collections;

CREATE POLICY "Users can manage milk collections based on role" 
ON public.milk_collections 
FOR ALL 
TO authenticated
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role) OR 
  has_role((SELECT auth.uid()), 'worker'::app_role) OR 
  has_role((SELECT auth.uid()), 'farmer'::app_role)
)
WITH CHECK (
  has_role((SELECT auth.uid()), 'admin'::app_role) OR 
  has_role((SELECT auth.uid()), 'worker'::app_role) OR 
  has_role((SELECT auth.uid()), 'farmer'::app_role)
);

-- 14. Fix milk production policies
DROP POLICY IF EXISTS "Admins and workers can manage milk production" ON public.milk_production;

CREATE POLICY "Admins and workers can manage milk production" 
ON public.milk_production 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 15. Fix milk rates policies
DROP POLICY IF EXISTS "Admins can manage milk rates" ON public.milk_rates;
DROP POLICY IF EXISTS "Users can view milk rates" ON public.milk_rates;

CREATE POLICY "Admins can manage milk rates" 
ON public.milk_rates 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can view milk rates" 
ON public.milk_rates 
FOR SELECT 
TO authenticated
USING (true);

-- 16. Fix milking logs policies
DROP POLICY IF EXISTS "Admins and workers can manage milking logs" ON public.milking_logs;

CREATE POLICY "Admins and workers can manage milking logs" 
ON public.milking_logs 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 17. Fix notification history policies
DROP POLICY IF EXISTS "System can insert notification history" ON public.notification_history;
DROP POLICY IF EXISTS "Users can update their own notification history" ON public.notification_history;
DROP POLICY IF EXISTS "Users can view their own notification history" ON public.notification_history;

CREATE POLICY "System can insert notification history" 
ON public.notification_history 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notification history" 
ON public.notification_history 
FOR UPDATE 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own notification history" 
ON public.notification_history 
FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 18. Fix notification settings policies
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON public.notification_settings;

CREATE POLICY "Users can manage their own notification settings" 
ON public.notification_settings 
FOR ALL 
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 19. Fix profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING ((SELECT auth.uid()) = id);

-- 20. Fix user roles policies
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 21. Fix vaccination records policies
DROP POLICY IF EXISTS "Admins and workers can manage vaccination records" ON public.vaccination_records;

CREATE POLICY "Admins and workers can manage vaccination records" 
ON public.vaccination_records 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));

-- 22. Fix vaccination schedules policies
DROP POLICY IF EXISTS "Admins can manage vaccination schedules" ON public.vaccination_schedules;
DROP POLICY IF EXISTS "Users can view vaccination schedules" ON public.vaccination_schedules;

CREATE POLICY "Admins can manage vaccination schedules" 
ON public.vaccination_schedules 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can view vaccination schedules" 
ON public.vaccination_schedules 
FOR SELECT 
TO authenticated
USING (true);

-- 23. Fix weight logs policies
DROP POLICY IF EXISTS "Admins and workers can manage weight logs" ON public.weight_logs;

CREATE POLICY "Admins and workers can manage weight logs" 
ON public.weight_logs 
FOR ALL 
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'worker'::app_role));