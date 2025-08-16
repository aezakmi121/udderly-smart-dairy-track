-- Add FCM token column to profiles table for push notifications
ALTER TABLE public.profiles 
ADD COLUMN fcm_token TEXT;

-- Create index for faster token lookups
CREATE INDEX idx_profiles_fcm_token ON public.profiles(fcm_token) 
WHERE fcm_token IS NOT NULL;