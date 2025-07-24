-- Create storage bucket for cow images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cow-images', 'cow-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for cow images bucket
CREATE POLICY "Anyone can view cow images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cow-images');

CREATE POLICY "Authenticated users can upload cow images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cow-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cow images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cow-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete cow images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cow-images' AND auth.role() = 'authenticated');