-- Auth and role scaffolding, applied AFTER the migrations.
--
-- auth.uid(), the user_roles table and has_role() live outside this repo's
-- migration history, and a migration recreates user_roles without its role
-- column, so this repairs the pieces the RLS policies depend on. auth.uid()
-- reads a session variable, letting a test act as any user.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('test.uid', true), '')::uuid;
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (user_id uuid NOT NULL);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role public.app_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

ALTER TABLE public.milk_collections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.farmer_payout_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_start date NOT NULL,
  cycle_end date NOT NULL,
  status text NOT NULL DEFAULT 'open'
);
