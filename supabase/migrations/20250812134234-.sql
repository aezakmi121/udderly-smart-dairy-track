-- Update signup flow: do not auto-assign default worker role on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone_number');
  
  -- If user was invited and invitation is valid, assign role from invitation
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    SELECT role INTO invitation_role
    FROM public.invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND email = NEW.email
      AND expires_at > now()
      AND used_at IS NULL;
    
    IF invitation_role IS NOT NULL THEN
      UPDATE public.invitations
      SET used_at = now()
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invitation_role);
    END IF;
  END IF;
  
  -- IMPORTANT: Do NOT assign any default role.
  -- New users without an invitation will have no role until an admin assigns one.
  
  RETURN NEW;
END;
$function$;