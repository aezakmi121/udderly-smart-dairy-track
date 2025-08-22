-- Add columns to cows table for tracking milking group moves
ALTER TABLE public.cows 
ADD COLUMN needs_milking_move boolean DEFAULT false,
ADD COLUMN needs_milking_move_at timestamp with time zone,
ADD COLUMN moved_to_milking boolean DEFAULT false,
ADD COLUMN moved_to_milking_at timestamp with time zone;