-- Fix the session window function with proper timezone handling
CREATE OR REPLACE FUNCTION public.is_within_session_window(
  _production_date date,
  _session text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM app_settings 
      WHERE key = 'milking_session_settings' 
      AND (value->>'enforceWindow')::boolean = true
    ) THEN true
    ELSE
      CASE _session
        WHEN 'morning' THEN
          (NOW() AT TIME ZONE COALESCE(
            (SELECT value->>'timezone' FROM app_settings WHERE key = 'milking_session_settings'), 
            'Asia/Kolkata'
          ))::time BETWEEN 
          COALESCE(
            (SELECT value->'morning'->>'start' FROM app_settings WHERE key = 'milking_session_settings'),
            '05:00'
          )::time AND
          COALESCE(
            (SELECT value->'morning'->>'end' FROM app_settings WHERE key = 'milking_session_settings'),
            '06:30'
          )::time
        WHEN 'evening' THEN
          (NOW() AT TIME ZONE COALESCE(
            (SELECT value->>'timezone' FROM app_settings WHERE key = 'milking_session_settings'), 
            'Asia/Kolkata'
          ))::time BETWEEN 
          COALESCE(
            (SELECT value->'evening'->>'start' FROM app_settings WHERE key = 'milking_session_settings'),
            '17:00'
          )::time AND
          COALESCE(
            (SELECT value->'evening'->>'end' FROM app_settings WHERE key = 'milking_session_settings'),
            '18:30'
          )::time
        ELSE true
      END
  END;
$$;