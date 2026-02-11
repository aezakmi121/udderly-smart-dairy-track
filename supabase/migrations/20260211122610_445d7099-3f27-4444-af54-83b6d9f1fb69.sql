-- Add onesignal_player_id column to profiles (replaces fcm_token usage)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onesignal_player_id text;

-- Optionally drop old columns that are no longer needed
-- (keeping them for now to avoid breaking existing data)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS fcm_token;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS expo_push_token;