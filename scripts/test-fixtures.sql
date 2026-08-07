-- Minimal stand-ins for base tables that predate this repo's migration history.
--
-- milk_collections and farmers were created outside the tracked migrations, so
-- a database built from supabase/migrations alone does not have them and the
-- rate functions that reference them fail to compile. These definitions carry
-- only the columns the rate logic and its tests touch -- they are a test
-- fixture, not a mirror of production. Applied before the migrations, so any
-- migration that ALTERs these tables still runs against them.

CREATE TABLE IF NOT EXISTS public.farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  farmer_code text,
  -- The phone is a login identifier now, so its uniqueness is under test.
  phone_number text,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.milk_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES public.farmers(id),
  collection_date date NOT NULL,
  session text NOT NULL,
  quantity numeric NOT NULL,
  fat_percentage numeric,
  snf_percentage numeric,
  rate_per_liter numeric,
  total_amount numeric,
  species text,
  is_accepted boolean DEFAULT true,
  remarks text,
  -- The undo window is judged on how long ago the row was written, so the
  -- fixture needs this even though the rate logic never looks at it.
  created_at timestamptz DEFAULT now()
);
