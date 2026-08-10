-- Make the breeding numbers explicit rather than implied by code defaults.
--
-- The screens previously ran on constants hardcoded in three places that did
-- not agree: gestation was 285 when a record was created and 283 in the alerts,
-- and the PD window was fixed at 45-60 while a `pd_alert_days` setting existed
-- that nothing read.
--
-- 285 days is this herd's own median across 16 recorded calvings (mean 284,
-- range 272-296), and matches every expected date already stored, so seeding it
-- moves nothing already on the farm's calendar.
--
-- The PD window opens at 35 rather than 45: palpation is reliable from about
-- then, and each week a cow goes unchecked is a 21-day oestrous cycle that
-- cannot be recovered. Farms preferring a later check can raise it in Settings.
INSERT INTO public.app_settings (key, value)
VALUES ('breeding_settings', '{
  "gestationDays": 285,
  "heatWatchFromDays": 18,
  "heatWatchToDays": 24,
  "pdDueFromDays": 35,
  "pdOverdueAfterDays": 60,
  "dueToCalveWithinDays": 21,
  "dryToMilkingDaysBefore": 30
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- The older alert path still reads this one; align it with what the records
-- were actually built with instead of leaving it two days adrift.
INSERT INTO public.app_settings (key, value)
VALUES ('delivery_expected_days', '285'::jsonb)
ON CONFLICT (key) DO NOTHING;
