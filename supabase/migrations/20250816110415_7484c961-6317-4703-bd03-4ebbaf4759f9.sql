-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  quiet_hours JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Create notification history table
CREATE TABLE public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  entity_id TEXT DEFAULT NULL,
  entity_type TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  snoozed_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_grouped BOOLEAN DEFAULT false,
  group_key TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_settings
CREATE POLICY "Users can manage their own notification settings"
ON public.notification_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for notification_history
CREATE POLICY "Users can view their own notification history"
ON public.notification_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification history"
ON public.notification_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notification history"
ON public.notification_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default notification settings for existing users
INSERT INTO public.notification_settings (user_id, category, enabled, channels)
SELECT 
  id,
  category,
  true,
  CASE 
    WHEN get_user_role(id) = 'admin' THEN '["in_app", "email"]'::jsonb
    WHEN get_user_role(id) = 'worker' THEN '["in_app"]'::jsonb
    ELSE '["in_app"]'::jsonb
  END
FROM auth.users
CROSS JOIN (
  VALUES 
    ('reminders'),
    ('alerts'),
    ('updates')
) AS categories(category)
ON CONFLICT (user_id, category) DO NOTHING;