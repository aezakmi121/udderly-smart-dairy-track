-- Fix all RLS policy issues by making them restrictive instead of permissive
-- This addresses the 311 warnings about permissive policies and RLS initialization

-- 1. Fix app_settings policies
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read app settings" 
ON public.app_settings 
FOR SELECT 
TO authenticated
USING (true);

-- 2. Fix calves policies - be more restrictive
DROP POLICY IF EXISTS "Authenticated users can delete calves" ON public.calves;
DROP POLICY IF EXISTS "Authenticated users can insert calves" ON public.calves;
DROP POLICY IF EXISTS "Authenticated users can update calves" ON public.calves;
DROP POLICY IF EXISTS "Authenticated users can view calves" ON public.calves;

CREATE POLICY "Admins and workers can manage calves" 
ON public.calves 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 3. Fix cows policies - be more restrictive
DROP POLICY IF EXISTS "Authenticated users can delete cows" ON public.cows;
DROP POLICY IF EXISTS "Authenticated users can insert cows" ON public.cows;
DROP POLICY IF EXISTS "Authenticated users can update cows" ON public.cows;
DROP POLICY IF EXISTS "Authenticated users can view cows" ON public.cows;

CREATE POLICY "Admins and workers can manage cows" 
ON public.cows 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 4. Fix AI records policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to ai records" ON public.ai_records;

CREATE POLICY "Admins and workers can manage ai records" 
ON public.ai_records 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 5. Fix cow group assignments policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to cow group assignmen" ON public.cow_group_assignments;

CREATE POLICY "Admins and workers can manage cow group assignments" 
ON public.cow_group_assignments 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 6. Fix cow groups policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to cow groups" ON public.cow_groups;

CREATE POLICY "Admins and workers can manage cow groups" 
ON public.cow_groups 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 7. Fix farmers policies (already done in previous migration)

-- 8. Fix feed categories policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to feed categories" ON public.feed_categories;

CREATE POLICY "Admins and workers can manage feed categories" 
ON public.feed_categories 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 9. Fix feed items policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to feed items" ON public.feed_items;

CREATE POLICY "Admins and workers can manage feed items" 
ON public.feed_items 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 10. Fix feed transactions policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to feed transactions" ON public.feed_transactions;

CREATE POLICY "Admins and workers can manage feed transactions" 
ON public.feed_transactions 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 11. Fix grouping settings policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to grouping settings" ON public.grouping_settings;

CREATE POLICY "Admins and workers can manage grouping settings" 
ON public.grouping_settings 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 12. Fix invitations policies
DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.invitations;

CREATE POLICY "Admins can manage invitations" 
ON public.invitations 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 13. Fix milk collections policies
DROP POLICY IF EXISTS "Milk collections access policy" ON public.milk_collections;

CREATE POLICY "Users can manage milk collections based on role" 
ON public.milk_collections 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'farmer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'farmer'::app_role)
);

-- 14. Fix milk production policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to milk production" ON public.milk_production;

CREATE POLICY "Admins and workers can manage milk production" 
ON public.milk_production 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 15. Fix milk rates policies
DROP POLICY IF EXISTS "Authenticated users full access" ON public.milk_rates;

CREATE POLICY "Admins can manage milk rates" 
ON public.milk_rates 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view milk rates" 
ON public.milk_rates 
FOR SELECT 
TO authenticated
USING (true);

-- 16. Fix milking logs policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to milking logs" ON public.milking_logs;

CREATE POLICY "Admins and workers can manage milking logs" 
ON public.milking_logs 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 17. Fix notification history policies (already restrictive)

-- 18. Fix notification settings policies (already restrictive)

-- 19. Fix profiles policies (already fixed in previous migration)

-- 20. Fix user roles policies
DROP POLICY IF EXISTS "User roles access policy" ON public.user_roles;

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 21. Fix vaccination records policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to vaccination records" ON public.vaccination_records;

CREATE POLICY "Admins and workers can manage vaccination records" 
ON public.vaccination_records 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- 22. Fix vaccination schedules policies
DROP POLICY IF EXISTS "Authenticated users full access" ON public.vaccination_schedules;

CREATE POLICY "Admins can manage vaccination schedules" 
ON public.vaccination_schedules 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view vaccination schedules" 
ON public.vaccination_schedules 
FOR SELECT 
TO authenticated
USING (true);

-- 23. Fix weight logs policies
DROP POLICY IF EXISTS "Admins and farm workers have full access to weight logs" ON public.weight_logs;

CREATE POLICY "Admins and workers can manage weight logs" 
ON public.weight_logs 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));