-- Rate lookup: treat unpriced cells as rejections, and derive species from the matrix.
--
-- Background: the rate matrix is a full fat x SNF grid in which combinations the
-- dairy will not buy are stored as 0. fn_get_rate previously returned those zeros
-- as source='matrix', i.e. indistinguishable from a real price, so rejected milk
-- was silently recorded at Rs.0.00. It also used MIN(rate) as the "floor" rate for
-- below-range samples, which is 0 for the same reason.

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
  eff_fat numeric;
  eff_snf numeric;
  fat_key numeric;
  snf_key numeric;
  result_rate numeric;
  is_high boolean := false;
  is_low boolean := false;
BEGIN
  SELECT MAX(rm.effective_from) INTO eff_date
  FROM public.rate_matrix rm
  WHERE rm.species = p_species AND rm.effective_from <= p_date;

  -- No matrix at all for this species on this date.
  IF eff_date IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, NULL::date, 'none'::text, p_fat, p_snf;
    RETURN;
  END IF;

  SELECT MAX(rm.fat), MIN(rm.fat), MAX(rm.snf), MIN(rm.snf)
    INTO fat_max, fat_min, snf_max, snf_min
  FROM public.rate_matrix rm
  WHERE rm.species = p_species AND rm.effective_from = eff_date;

  -- Clamp the sample onto the grid in both directions, then look the cell up.
  -- Out-of-range no longer short-circuits to a floor rate; the clamped cell
  -- decides, and a zero cell is reported as a rejection like any other.
  eff_fat := p_fat;
  eff_snf := p_snf;
  IF p_fat > fat_max THEN eff_fat := fat_max; is_high := true; END IF;
  IF p_snf > snf_max THEN eff_snf := snf_max; is_high := true; END IF;
  IF p_fat < fat_min THEN eff_fat := fat_min; is_low := true; END IF;
  IF p_snf < snf_min THEN eff_snf := snf_min; is_low := true; END IF;

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

  -- A zero cell is not a price. This fat/SNF combination is outside the band
  -- the dairy pays for, so report it as a rejection rather than a Rs.0 rate.
  IF result_rate IS NULL OR result_rate = 0 THEN
    RETURN QUERY SELECT 0::numeric, eff_date, 'rejected'::text, eff_fat, eff_snf;
    RETURN;
  END IF;

  -- Rate lists are quoted in paise; store what the slip prints so that
  -- quantity x printed rate always reconciles with the printed total.
  result_rate := round(result_rate, 2);

  IF is_high THEN
    RETURN QUERY SELECT result_rate, eff_date, 'clamped_high'::text, eff_fat, eff_snf;
  ELSIF is_low THEN
    RETURN QUERY SELECT result_rate, eff_date, 'clamped_low'::text, eff_fat, eff_snf;
  ELSE
    RETURN QUERY SELECT result_rate, eff_date, 'matrix'::text, eff_fat, eff_snf;
  END IF;
END;
$function$;

-- Derive species from the rate matrix instead of from configured fat/SNF
-- thresholds. The matrix already encodes which band belongs to which species,
-- so the species that yields a payable rate IS the species. This removes the
-- second source of truth that could drift out of step with an uploaded list.
CREATE OR REPLACE FUNCTION public.fn_resolve_rate(
  p_fat numeric,
  p_snf numeric,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  species text,
  rate numeric,
  effective_from date,
  source text,
  used_fat numeric,
  used_snf numeric,
  ambiguous boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT
      s.c_species,
      r.rate        AS c_rate,
      r.effective_from AS c_eff,
      r.source      AS c_source,
      r.used_fat    AS c_used_fat,
      r.used_snf    AS c_used_snf
    FROM (
      SELECT DISTINCT rm.species AS c_species
      FROM public.rate_matrix rm
      WHERE rm.effective_from <= p_date
    ) s
    CROSS JOIN LATERAL public.fn_get_rate(s.c_species, p_fat, p_snf, p_date) r
  ),
  payable AS (
    SELECT * FROM candidates WHERE c_rate IS NOT NULL AND c_rate > 0
  )
  SELECT * FROM (
    SELECT
      c_species,
      c_rate,
      c_eff,
      c_source,
      c_used_fat,
      c_used_snf,
      (SELECT count(*) FROM payable) > 1
    FROM payable
    ORDER BY c_rate DESC
    LIMIT 1
  ) hit
  UNION ALL
  -- Nothing payable: either no matrix loaded at all, or a genuine rejection.
  SELECT
    NULL::text,
    0::numeric,
    (SELECT MAX(c_eff) FROM candidates),
    CASE
      WHEN EXISTS (SELECT 1 FROM candidates WHERE c_source <> 'none') THEN 'rejected'
      ELSE 'none'
    END,
    p_fat,
    p_snf,
    false
  WHERE NOT EXISTS (SELECT 1 FROM payable);
$function$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_rate(numeric, numeric, date) TO anon, authenticated, service_role;
