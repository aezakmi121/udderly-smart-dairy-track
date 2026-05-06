
SELECT cron.schedule(
  'payout-rollover-ist-midnight',
  '30 18 * * *',
  $$
  SELECT net.http_post(
    url:='https://gjimccbtclynetngfrpw.supabase.co/functions/v1/rollover-payout-cycle',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaW1jY2J0Y2x5bmV0bmdmcnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTU2NTQsImV4cCI6MjA2NzE5MTY1NH0.IhCGLeAp7fahlEvWt5BnpIEfpbm6T-vHjilv8S5OuFg"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
