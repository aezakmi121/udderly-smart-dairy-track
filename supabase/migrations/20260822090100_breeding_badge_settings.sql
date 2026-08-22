-- The two numbers behind the board's badges.
--
--  * repeatBreederServices -- services in one lactation without conceiving
--    before she is worth a second look. Three is the standard definition; at
--    four you have already burned an extra oestrous cycle before anyone asks.
--
--  * longOpenDays -- days open past which she is behind on the calving
--    interval. A 13-month interval is about 90 days open, so 120 is a month
--    past target and still recoverable; by 150 it is not.
--
-- Merged rather than inserted: the seed used ON CONFLICT DO NOTHING, so a farm
-- that already has the row would never see new keys. COALESCE leaves any
-- existing choice alone.
UPDATE public.app_settings
SET value = value
  || jsonb_build_object('repeatBreederServices',
       COALESCE(value -> 'repeatBreederServices', to_jsonb(3)))
  || jsonb_build_object('longOpenDays',
       COALESCE(value -> 'longOpenDays', to_jsonb(120)))
WHERE key = 'breeding_settings';

INSERT INTO public.app_settings (key, value)
VALUES ('breeding_settings', '{
  "gestationDays": 285,
  "heatWatchFromDays": 18,
  "heatWatchToDays": 24,
  "pdDueFromDays": 35,
  "pdOverdueAfterDays": 60,
  "dueToCalveWithinDays": 21,
  "dryToMilkingDaysBefore": 30,
  "serviceDueAfterCalvingDays": 60,
  "repeatBreederServices": 3,
  "longOpenDays": 120
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
