
-- Remove old cron jobs
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('daily-check-alerts', 'milking-reminders');

-- Re-create with proper Authorization header
SELECT cron.schedule(
  'daily-check-alerts',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gjimccbtclynetngfrpw.supabase.co/functions/v1/check-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaW1jY2J0Y2x5bmV0bmdmcnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTU2NTQsImV4cCI6MjA2NzE5MTY1NH0.IhCGLeAp7fahlEvWt5BnpIEfpbm6T-vHjilv8S5OuFg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'milking-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gjimccbtclynetngfrpw.supabase.co/functions/v1/send-milking-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaW1jY2J0Y2x5bmV0bmdmcnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTU2NTQsImV4cCI6MjA2NzE5MTY1NH0.IhCGLeAp7fahlEvWt5BnpIEfpbm6T-vHjilv8S5OuFg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
