-- Create table for people who can pay for expenses
CREATE TABLE public.paid_by_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paid_by_people ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage paid by people" 
ON public.paid_by_people 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_paid_by_people_updated_at
BEFORE UPDATE ON public.paid_by_people
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default people
INSERT INTO public.paid_by_people (name) VALUES 
('Owner'),
('Manager'),
('Accountant');