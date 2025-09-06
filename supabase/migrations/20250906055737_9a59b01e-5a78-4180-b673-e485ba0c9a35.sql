-- Add species column to milk_collections table
ALTER TABLE public.milk_collections 
ADD COLUMN species TEXT NOT NULL DEFAULT 'Cow';

-- Add check constraint to ensure valid species values
ALTER TABLE public.milk_collections 
ADD CONSTRAINT milk_collections_species_check 
CHECK (species IN ('Cow', 'Buffalo'));