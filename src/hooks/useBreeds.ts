import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Breed {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export const useBreeds = () => {
  const { data: breeds } = useQuery({
    queryKey: ['breeds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeds')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Breed[];
    }
  });

  return { breeds };
};