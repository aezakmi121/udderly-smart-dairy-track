-- Create rate_matrix table for Excel-based Fat-SNF rate charts
CREATE TABLE IF NOT EXISTS public.rate_matrix (
  species TEXT NOT NULL,
  fat NUMERIC NOT NULL,
  snf NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  effective_from DATE NOT NULL,
  inserted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (species, fat, snf, effective_from)
);

-- Enable RLS
ALTER TABLE public.rate_matrix ENABLE ROW LEVEL SECURITY;

-- Admin can manage rate matrix
CREATE POLICY "Admins can manage rate matrix" 
ON public.rate_matrix 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view rate matrix
CREATE POLICY "Users can view rate matrix" 
ON public.rate_matrix 
FOR SELECT 
USING (true);

-- Create RPC function to get rate for given species, fat, snf, and date
CREATE OR REPLACE FUNCTION public.fn_get_rate(
  p_species TEXT,
  p_fat NUMERIC,
  p_snf NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(rate NUMERIC, effective_from DATE) AS $$
DECLARE
  eff_date DATE;
  fat_key NUMERIC;
  snf_key NUMERIC;
  result_rate NUMERIC;
BEGIN
  -- Find the most recent effective date for this species that is <= p_date
  SELECT MAX(rm.effective_from) INTO eff_date
  FROM public.rate_matrix rm
  WHERE rm.species = p_species 
    AND rm.effective_from <= p_date;
  
  -- If no effective date found, return null
  IF eff_date IS NULL THEN
    RETURN QUERY SELECT NULL::NUMERIC, NULL::DATE;
    RETURN;
  END IF;
  
  -- Find the floor fat value (largest fat <= p_fat)
  SELECT MAX(rm.fat) INTO fat_key
  FROM public.rate_matrix rm
  WHERE rm.species = p_species 
    AND rm.effective_from = eff_date
    AND rm.fat <= p_fat;
  
  -- Find the floor snf value (largest snf <= p_snf)  
  SELECT MAX(rm.snf) INTO snf_key
  FROM public.rate_matrix rm
  WHERE rm.species = p_species 
    AND rm.effective_from = eff_date
    AND rm.snf <= p_snf;
  
  -- Get the rate for this combination
  SELECT rm.rate INTO result_rate
  FROM public.rate_matrix rm
  WHERE rm.species = p_species 
    AND rm.effective_from = eff_date
    AND rm.fat = fat_key
    AND rm.snf = snf_key;
  
  RETURN QUERY SELECT result_rate, eff_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;