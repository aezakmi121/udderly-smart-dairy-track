-- Add 'sold' status to cow_status enum if not already present
-- First, let's check current enum values and add sold if needed
ALTER TYPE cow_status ADD VALUE IF NOT EXISTS 'sold';

-- Add 'promoted' status to calf_status enum for better tracking
ALTER TYPE calf_status ADD VALUE IF NOT EXISTS 'promoted';