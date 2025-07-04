
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Cow {
  id: string;
  cow_number: string;
}

export const useCows = () => {
  const { data: cows } = useQuery({
    queryKey: ['cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number')
        .eq('status', 'active')
        .order('cow_number');
      
      if (error) throw error;
      return data as Cow[];
    }
  });

  return { cows };
};
