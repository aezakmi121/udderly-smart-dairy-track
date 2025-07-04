
-- First, let's ensure we have proper role assignments and update the user roles system
-- Update the profiles table to ensure role consistency
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'eccc0710-369d-4c43-be95-6a93c7d6bf9a';

-- Insert admin role in user_roles table if it doesn't exist
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES ('eccc0710-369d-4c43-be95-6a93c7d6bf9a', 'admin', 'eccc0710-369d-4c43-be95-6a93c7d6bf9a')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create more specific role-based RLS policies for different access levels
-- Update milk_collections policies for collection centre role
DROP POLICY IF EXISTS "Authenticated users full access" ON public.milk_collections;

CREATE POLICY "Admins have full access to milk collections"
  ON public.milk_collections
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Farm workers can view milk collections"
  ON public.milk_collections
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'worker') OR has_role(auth.uid(), 'farmer'));

CREATE POLICY "Collection centre can insert milk collections"
  ON public.milk_collections
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'worker') OR has_role(auth.uid(), 'farmer'));

-- Update farmers policies for collection centre role
DROP POLICY IF EXISTS "Authenticated users full access" ON public.farmers;

CREATE POLICY "Admins have full access to farmers"
  ON public.farmers
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Collection centre can view and insert farmers"
  ON public.farmers
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'worker') OR has_role(auth.uid(), 'farmer'));

CREATE POLICY "Collection centre can add farmers"
  ON public.farmers
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'worker') OR has_role(auth.uid(), 'farmer'));

-- Farm worker access policies for various tables
-- Milk Production
DROP POLICY IF EXISTS "Authenticated users full access" ON public.milk_production;

CREATE POLICY "Admins and farm workers have full access to milk production"
  ON public.milk_production
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- Vaccination Records
DROP POLICY IF EXISTS "Authenticated users full access" ON public.vaccination_records;

CREATE POLICY "Admins and farm workers have full access to vaccination records"
  ON public.vaccination_records
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- Weight Logs
DROP POLICY IF EXISTS "Authenticated users full access" ON public.weight_logs;

CREATE POLICY "Admins and farm workers have full access to weight logs"
  ON public.weight_logs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- AI Records
DROP POLICY IF EXISTS "Authenticated users full access" ON public.ai_records;

CREATE POLICY "Admins and farm workers have full access to ai records"
  ON public.ai_records
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- Feed Categories
DROP POLICY IF EXISTS "Authenticated users full access" ON public.feed_categories;

CREATE POLICY "Admins and farm workers have full access to feed categories"
  ON public.feed_categories
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- Feed Items
DROP POLICY IF EXISTS "Authenticated users full access" ON public.feed_items;

CREATE POLICY "Admins and farm workers have full access to feed items"
  ON public.feed_items
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));

-- Feed Transactions
DROP POLICY IF EXISTS "Authenticated users full access" ON public.feed_transactions;

CREATE POLICY "Admins and farm workers have full access to feed transactions"
  ON public.feed_transactions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'worker'));
