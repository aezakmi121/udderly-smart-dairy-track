
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Cow {
  id: string;
  cow_number: string;
  status: string;
}

export const useCows = () => {
  const { data: cows } = useQuery({
    queryKey: ['cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Sort numerically by cow_number
      const sortedData = (data as Cow[]).sort((a, b) => {
        const numA = parseFloat(a.cow_number);
        const numB = parseFloat(b.cow_number);
        
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        
        return a.cow_number.localeCompare(b.cow_number);
      });
      
      
      return sortedData;
    }
  });

  return { cows };
};
