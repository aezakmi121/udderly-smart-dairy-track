-- Remove date_of_conception column from calves table
ALTER TABLE public.calves DROP COLUMN IF EXISTS date_of_conception;