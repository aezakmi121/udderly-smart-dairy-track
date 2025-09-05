-- Fix function search path security issue
DROP FUNCTION IF EXISTS public.fn_get_rate(TEXT, NUMERIC, NUMERIC, DATE);

CREATE OR REPLACE FUNCTION public.fn_get_rate(
  p_species TEXT,
  p_fat NUMERIC,
  p_snf NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(rate NUMERIC, effective_from DATE) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;