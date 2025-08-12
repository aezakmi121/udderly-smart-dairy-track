-- Create function to auto-update updated_at if not present
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create milking_logs table
CREATE TABLE IF NOT EXISTS public.milking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL,
  session text NOT NULL CHECK (session IN ('morning','evening')),
  milking_start_time timestamptz,
  milking_end_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT milking_logs_unique_date_session UNIQUE (production_date, session)
);

-- Enable RLS
ALTER TABLE public.milking_logs ENABLE ROW LEVEL SECURITY;

-- Policies for admins and workers (same as milk_production)
DROP POLICY IF EXISTS "Admins and farm workers have full access to milking logs" ON public.milking_logs;
CREATE POLICY "Admins and farm workers have full access to milking logs"
ON public.milking_logs
FOR ALL
USING (
  has_role((SELECT auth.uid() AS uid), 'admin'::app_role) OR
  has_role((SELECT auth.uid() AS uid), 'worker'::app_role)
)
WITH CHECK (
  has_role((SELECT auth.uid() AS uid), 'admin'::app_role) OR
  has_role((SELECT auth.uid() AS uid), 'worker'::app_role)
);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS update_milking_logs_updated_at ON public.milking_logs;
CREATE TRIGGER update_milking_logs_updated_at
BEFORE UPDATE ON public.milking_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();