-- Create breeds table
CREATE TABLE public.breeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.breeds ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view breeds" 
ON public.breeds 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage breeds" 
ON public.breeds 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add some default breeds
INSERT INTO public.breeds (name, description) VALUES
('Holstein', 'Black and white dairy breed'),
('Jersey', 'Small brown dairy breed'),
('Guernsey', 'Golden dairy breed'),
('Ayrshire', 'Red and white dairy breed'),
('Brown Swiss', 'Brown dairy breed'),
('Crossbred', 'Mixed breed cattle'),
('Local', 'Local indigenous breed');

-- Create trigger for updated_at
CREATE TRIGGER update_breeds_updated_at
  BEFORE UPDATE ON public.breeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();