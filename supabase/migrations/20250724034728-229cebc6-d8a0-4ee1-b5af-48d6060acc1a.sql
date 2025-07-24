-- Add fields to track calf promotion history in cows table
ALTER TABLE public.cows 
ADD COLUMN IF NOT EXISTS promoted_from_calf_id UUID REFERENCES public.calves(id),
ADD COLUMN IF NOT EXISTS original_mother_cow_id UUID REFERENCES public.cows(id),
ADD COLUMN IF NOT EXISTS is_promoted_calf BOOLEAN DEFAULT FALSE;