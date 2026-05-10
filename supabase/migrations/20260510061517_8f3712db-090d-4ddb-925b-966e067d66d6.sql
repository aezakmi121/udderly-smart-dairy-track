
CREATE TABLE public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  subscription_endpoint_hash text,
  event_type text NOT NULL,
  payload_tag text,
  status text,
  error_code int,
  source text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_events_created ON public.notification_events (created_at DESC);
CREATE INDEX idx_notif_events_tag ON public.notification_events (payload_tag, created_at DESC);
CREATE INDEX idx_notif_events_user ON public.notification_events (user_id, created_at DESC);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notification events"
ON public.notification_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Schedule pruning at 03:00 IST = 21:30 UTC
SELECT cron.schedule(
  'prune-stale-subscriptions',
  '30 21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gjimccbtclynetngfrpw.supabase.co/functions/v1/prune-stale-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaW1jY2J0Y2x5bmV0bmdmcnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTU2NTQsImV4cCI6MjA2NzE5MTY1NH0.IhCGLeAp7fahlEvWt5BnpIEfpbm6T-vHjilv8S5OuFg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
