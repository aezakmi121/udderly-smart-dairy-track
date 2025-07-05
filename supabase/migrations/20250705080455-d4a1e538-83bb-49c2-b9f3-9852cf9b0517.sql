
-- Create cow_groups table
CREATE TABLE public.cow_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  description TEXT,
  min_yield NUMERIC,
  max_yield NUMERIC,
  min_days_in_milk INTEGER,
  max_days_in_milk INTEGER,
  feed_requirements JSONB, -- Store feed requirements as JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cow_group_assignments table to track which cows belong to which groups
CREATE TABLE public.cow_group_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cow_id UUID REFERENCES public.cows(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.cow_groups(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  assigned_by_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cow_id, group_id, is_active) -- Ensure a cow can only be in one active group
);

-- Create grouping_settings table for auto-grouping parameters
CREATE TABLE public.grouping_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for cow_groups
ALTER TABLE public.cow_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and farm workers have full access to cow groups"
ON public.cow_groups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- Add RLS policies for cow_group_assignments
ALTER TABLE public.cow_group_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and farm workers have full access to cow group assignments"
ON public.cow_group_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- Add RLS policies for grouping_settings
ALTER TABLE public.grouping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and farm workers have full access to grouping settings"
ON public.grouping_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

-- Insert default grouping settings
INSERT INTO public.grouping_settings (setting_name, setting_value, description) VALUES 
('auto_grouping_enabled', '{"enabled": true}'::jsonb, 'Enable automatic cow grouping'),
('grouping_criteria', '{"primary": "yield", "secondary": "days_in_milk"}'::jsonb, 'Primary and secondary criteria for grouping'),
('yield_thresholds', '{"high": 20, "medium": 10, "low": 0}'::jsonb, 'Yield thresholds for grouping (liters per day)'),
('days_in_milk_thresholds', '{"early": 100, "mid": 200, "late": 300}'::jsonb, 'Days in milk thresholds for grouping');

-- Insert default cow groups
INSERT INTO public.cow_groups (group_name, description, min_yield, max_yield, min_days_in_milk, max_days_in_milk, feed_requirements) VALUES 
('High Producers', 'Cows producing more than 20L per day', 20, NULL, NULL, NULL, '{"silage": 25, "concentrate": 8, "roughage": 15}'::jsonb),
('Medium Producers', 'Cows producing 10-20L per day', 10, 20, NULL, NULL, '{"silage": 20, "concentrate": 6, "roughage": 12}'::jsonb),
('Low Producers', 'Cows producing less than 10L per day', NULL, 10, NULL, NULL, '{"silage": 15, "concentrate": 4, "roughage": 10}'::jsonb);
