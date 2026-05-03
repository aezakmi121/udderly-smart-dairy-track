DROP FUNCTION IF EXISTS public.fn_get_rate(text, numeric, numeric, date);

CREATE OR REPLACE FUNCTION public.fn_get_rate(
  p_species text,
  p_fat numeric,
  p_snf numeric,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(rate numeric, effective_from date, source text, used_fat numeric, used_snf numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  eff_date date;
  fat_max numeric;
  fat_min numeric;
  snf_max numeric;
  snf_min numeric;
  min_rate numeric;
  eff_fat numeric;
  eff_snf numeric;
  fat_key numeric;
  snf_key numeric;
  result_rate numeric;
  is_high boolean := false;
BEGIN
  SELECT MAX(rm.effective_from) INTO eff_date
  FROM public.rate_matrix rm
  WHERE rm.species = p_species AND rm.effective_from <= p_date;

  IF eff_date IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, NULL::date, 'none'::text, p_fat, p_snf;
    RETURN;
  END IF;

  SELECT MAX(rm.fat), MIN(rm.fat), MAX(rm.snf), MIN(rm.snf), MIN(rm.rate)
    INTO fat_max, fat_min, snf_max, snf_min, min_rate
  FROM public.rate_matrix rm
  WHERE rm.species = p_species AND rm.effective_from = eff_date;

  IF p_fat < fat_min OR p_snf < snf_min THEN
    RETURN QUERY SELECT min_rate, eff_date, 'clamped_low'::text, p_fat, p_snf;
    RETURN;
  END IF;

  eff_fat := p_fat;
  eff_snf := p_snf;
  IF p_fat > fat_max THEN eff_fat := fat_max; is_high := true; END IF;
  IF p_snf > snf_max THEN eff_snf := snf_max; is_high := true; END IF;

  SELECT MAX(rm.fat) INTO fat_key
  FROM public.rate_matrix rm
  WHERE rm.species = p_species AND rm.effective_from = eff_date AND rm.fat <= eff_fat;

  SELECT MAX(rm.snf) INTO snf_key
  FROM public.rate_matrix rm
  WHERE rm.species = p_species AND rm.effective_from = eff_date AND rm.snf <= eff_snf;

  SELECT rm.rate INTO result_rate
  FROM public.rate_matrix rm
  WHERE rm.species = p_species
    AND rm.effective_from = eff_date
    AND rm.fat = fat_key
    AND rm.snf = snf_key;

  IF result_rate IS NULL THEN
    RETURN QUERY SELECT min_rate, eff_date, 'clamped_low'::text, eff_fat, eff_snf;
    RETURN;
  END IF;

  IF is_high THEN
    RETURN QUERY SELECT result_rate, eff_date, 'clamped_high'::text, eff_fat, eff_snf;
  ELSE
    RETURN QUERY SELECT result_rate, eff_date, 'matrix'::text, eff_fat, eff_snf;
  END IF;
END;
$function$;