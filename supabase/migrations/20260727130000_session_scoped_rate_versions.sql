-- Rate lists can take effect mid-day, e.g. "new rates from 1 Aug, evening session".
-- effective_from was a bare date, so a new list always started at the morning
-- session and there was no way to express that. Version identity becomes
-- (effective_from, effective_session), ordered morning -> evening within a day.

ALTER TABLE public.rate_matrix
  ADD COLUMN IF NOT EXISTS effective_session text NOT NULL DEFAULT 'morning';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_matrix_effective_session_check'
  ) THEN
    ALTER TABLE public.rate_matrix
      ADD CONSTRAINT rate_matrix_effective_session_check
      CHECK (effective_session IN ('morning', 'evening'));
  END IF;
END $$;

-- Existing rows keep effective_session='morning', so every current version
-- still starts at the beginning of its day and nothing is re-rated.
ALTER TABLE public.rate_matrix DROP CONSTRAINT IF EXISTS rate_matrix_pkey;
ALTER TABLE public.rate_matrix
  ADD CONSTRAINT rate_matrix_pkey
  PRIMARY KEY (species, fat, snf, effective_from, effective_session);

DROP FUNCTION IF EXISTS public.fn_get_rate(text, numeric, numeric, date);
DROP FUNCTION IF EXISTS public.fn_get_rate(text, numeric, numeric, date, text);

CREATE OR REPLACE FUNCTION public.fn_get_rate(
  p_species text,
  p_fat numeric,
  p_snf numeric,
  p_date date DEFAULT CURRENT_DATE,
  p_session text DEFAULT 'morning'
)
RETURNS TABLE(
  rate numeric,
  effective_from date,
  effective_session text,
  source text,
  used_fat numeric,
  used_snf numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  eff_date date;
  eff_session text;
  want_rank int;
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
  want_rank := CASE WHEN lower(coalesce(p_session, 'morning')) = 'evening' THEN 1 ELSE 0 END;

  -- Latest version at or before this (date, session).
  SELECT rm.effective_from, rm.effective_session
    INTO eff_date, eff_session
  FROM public.rate_matrix rm
  WHERE rm.species = p_species
    AND (rm.effective_from, CASE WHEN rm.effective_session = 'evening' THEN 1 ELSE 0 END)
        <= (p_date, want_rank)
  ORDER BY rm.effective_from DESC,
           CASE WHEN rm.effective_session = 'evening' THEN 1 ELSE 0 END DESC
  LIMIT 1;

  -- No matrix at all for this species at this point in time.
  IF eff_date IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, NULL::date, NULL::text, 'none'::text, p_fat, p_snf;
    RETURN;
  END IF;

  SELECT MAX(rm.fat), MIN(rm.fat), MAX(rm.snf), MIN(rm.snf)
    INTO fat_max, fat_min, snf_max, snf_min
  FROM public.rate_matrix rm
  WHERE rm.species = p_species
    AND rm.effective_from = eff_date
    AND rm.effective_session = eff_session;

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
  WHERE rm.species = p_species AND rm.effective_from = eff_date
    AND rm.effective_session = eff_session AND rm.fat <= eff_fat;

  SELECT MAX(rm.snf) INTO snf_key
  FROM public.rate_matrix rm
  WHERE rm.species = p_species AND rm.effective_from = eff_date
    AND rm.effective_session = eff_session AND rm.snf <= eff_snf;

  SELECT rm.rate INTO result_rate
  FROM public.rate_matrix rm
  WHERE rm.species = p_species
    AND rm.effective_from = eff_date
    AND rm.effective_session = eff_session
    AND rm.fat = fat_key
    AND rm.snf = snf_key;

  -- A zero cell is not a price. This fat/SNF combination is outside the band
  -- the dairy pays for, so report it as a rejection rather than a Rs.0 rate.
  IF result_rate IS NULL OR result_rate = 0 THEN
    RETURN QUERY SELECT 0::numeric, eff_date, eff_session, 'rejected'::text, eff_fat, eff_snf;
    RETURN;
  END IF;

  -- Rate lists are quoted in paise; store what the slip prints so that
  -- quantity x printed rate always reconciles with the printed total.
  result_rate := round(result_rate, 2);

  IF is_high THEN
    RETURN QUERY SELECT result_rate, eff_date, eff_session, 'clamped_high'::text, eff_fat, eff_snf;
  ELSIF is_low THEN
    RETURN QUERY SELECT result_rate, eff_date, eff_session, 'clamped_low'::text, eff_fat, eff_snf;
  ELSE
    RETURN QUERY SELECT result_rate, eff_date, eff_session, 'matrix'::text, eff_fat, eff_snf;
  END IF;
END;
$function$;

DROP FUNCTION IF EXISTS public.fn_resolve_rate(numeric, numeric, date);
DROP FUNCTION IF EXISTS public.fn_resolve_rate(numeric, numeric, date, text);

CREATE OR REPLACE FUNCTION public.fn_resolve_rate(
  p_fat numeric,
  p_snf numeric,
  p_date date DEFAULT CURRENT_DATE,
  p_session text DEFAULT 'morning'
)
RETURNS TABLE(
  species text,
  rate numeric,
  effective_from date,
  effective_session text,
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
      r.rate            AS c_rate,
      r.effective_from  AS c_eff,
      r.effective_session AS c_eff_session,
      r.source          AS c_source,
      r.used_fat        AS c_used_fat,
      r.used_snf        AS c_used_snf
    FROM (
      SELECT DISTINCT rm.species AS c_species
      FROM public.rate_matrix rm
      WHERE (rm.effective_from, CASE WHEN rm.effective_session = 'evening' THEN 1 ELSE 0 END)
            <= (p_date, CASE WHEN lower(coalesce(p_session, 'morning')) = 'evening' THEN 1 ELSE 0 END)
    ) s
    CROSS JOIN LATERAL public.fn_get_rate(s.c_species, p_fat, p_snf, p_date, p_session) r
  ),
  payable AS (
    SELECT * FROM candidates WHERE c_rate IS NOT NULL AND c_rate > 0
  )
  SELECT * FROM (
    SELECT
      c_species,
      c_rate,
      c_eff,
      c_eff_session,
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
    NULL::text,
    CASE
      WHEN EXISTS (SELECT 1 FROM candidates WHERE c_source <> 'none') THEN 'rejected'
      ELSE 'none'
    END,
    p_fat,
    p_snf,
    false
  WHERE NOT EXISTS (SELECT 1 FROM payable);
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_rate(text, numeric, numeric, date, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_resolve_rate(numeric, numeric, date, text) TO anon, authenticated, service_role;
