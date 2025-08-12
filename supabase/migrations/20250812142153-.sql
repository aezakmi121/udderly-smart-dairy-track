-- Promote specific user to admin and clean previous roles
-- Identified by email anshul477@gmail.com (user_id below)
DO $$
DECLARE
  target_user uuid := 'eccc0710-369d-4c43-be95-6a93c7d6bf9a';
BEGIN
  -- Remove any existing roles
  DELETE FROM public.user_roles WHERE user_id = target_user;
  -- Assign admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user, 'admin');
END $$;