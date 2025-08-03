-- Create invitations table for managing user invitations
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT invitations_not_expired CHECK (expires_at > created_at)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations
CREATE POLICY "Admins can manage all invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create index for token lookups
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- Update handle_new_user function to handle invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone_number');
  
  -- Check if user was invited (look for invitation token in metadata)
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    -- Get role from invitation
    SELECT role INTO invitation_role
    FROM public.invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND email = NEW.email
      AND expires_at > now()
      AND used_at IS NULL;
    
    IF invitation_role IS NOT NULL THEN
      -- Mark invitation as used
      UPDATE public.invitations
      SET used_at = now()
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';
      
      -- Assign the invited role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invitation_role);
    ELSE
      -- Default to worker if invitation not found or expired
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'worker')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  ELSE
    -- Assign default worker role if no invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'worker')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;