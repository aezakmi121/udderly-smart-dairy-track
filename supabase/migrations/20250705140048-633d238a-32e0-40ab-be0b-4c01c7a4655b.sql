
-- Add variant_id column to scheme_product_discounts table to support product variant discounts
ALTER TABLE public.scheme_product_discounts 
ADD COLUMN variant_id UUID REFERENCES public.pos_product_variants(id) ON DELETE CASCADE;

-- Update the unique constraint to include variant_id to allow multiple discounts per product (for different variants)
ALTER TABLE public.scheme_product_discounts DROP CONSTRAINT IF EXISTS scheme_product_discounts_scheme_id_product_id_key;

-- Create a new unique constraint that considers scheme_id, product_id, and variant_id
-- This allows one discount per product variant per scheme, or one general discount per product per scheme
ALTER TABLE public.scheme_product_discounts 
ADD CONSTRAINT scheme_product_discounts_unique_per_variant 
UNIQUE (scheme_id, product_id, variant_id);
