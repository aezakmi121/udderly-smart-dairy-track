-- The voluntary waiting period, stored rather than left to a code default.
--
-- Past this many days since calving with nothing booked, a cow appears on the
-- board under "AI pending". She had no heading at all before: her last record
-- is closed, so no action group claimed her, and an empty cow quietly cost a
-- lactation while looking fine on screen.
--
-- The seed migration used ON CONFLICT DO NOTHING, so a farm that already has
-- the row needs this merge to see the key at all.
--
-- "Due to calve" is deliberately left where it is. Widening it to a month
-- would make it the same set of cows as "move to milking", which happens 30
-- days out -- one job listed twice under two names is what separating them was
-- for. Three weeks is already less than a month.
UPDATE public.app_settings
SET value = value || jsonb_build_object('serviceDueAfterCalvingDays',
       COALESCE(value -> 'serviceDueAfterCalvingDays', to_jsonb(60)))
WHERE key = 'breeding_settings';

-- And for a farm that has not been seeded yet.
INSERT INTO public.app_settings (key, value)
VALUES ('breeding_settings', '{
  "gestationDays": 285,
  "heatWatchFromDays": 18,
  "heatWatchToDays": 24,
  "pdDueFromDays": 35,
  "pdOverdueAfterDays": 60,
  "dueToCalveWithinDays": 21,
  "dryToMilkingDaysBefore": 30,
  "serviceDueAfterCalvingDays": 60
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
