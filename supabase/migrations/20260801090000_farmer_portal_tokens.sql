-- A way into the farmer portal that does not need a phone.
--
-- Phone OTP only reaches farmers who have a phone: of 61 farmers, 29 have a
-- usable number. The slip is the one thing every farmer gets twice a day, so it
-- carries a QR holding a link keyed to a token. Scanning it opens that farmer's
-- own earnings with no code to type and nothing to remember, and a farmer
-- without a phone can hand the paper to someone who has one.
--
-- The token is a bearer credential: whoever holds the slip can see that
-- farmer's figures. That is a deliberate trade -- totals are already shared
-- openly -- and it is why the token is per farmer and resettable rather than
-- something that would expose anyone else.
ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS portal_token text;

-- URL-safe and short, so the QR stays coarse enough for a cheap phone camera
-- to read off thermal paper. 24 characters of base64url is ~143 bits.
CREATE OR REPLACE FUNCTION public.fn_generate_portal_token()
RETURNS text
LANGUAGE sql
VOLATILE
AS $function$
  SELECT translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_');
$function$;

UPDATE public.farmers
SET portal_token = public.fn_generate_portal_token()
WHERE portal_token IS NULL;

ALTER TABLE public.farmers
  ALTER COLUMN portal_token SET DEFAULT public.fn_generate_portal_token();

-- A token that matched two farmers would show the wrong person's earnings.
CREATE UNIQUE INDEX IF NOT EXISTS farmers_portal_token_key
  ON public.farmers (portal_token);

COMMENT ON COLUMN public.farmers.portal_token IS
  'Bearer token printed as a QR on collection slips; regenerate to void every slip issued to this farmer';
