
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Cow {
  id: string;
  cow_number: string;
  status: string;
}

const sortCows = (data: Cow[]) => {
  return data.sort((a, b) => {
    const numA = parseFloat(a.cow_number);
    const numB = parseFloat(b.cow_number);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    
    return a.cow_number.localeCompare(b.cow_number);
  });
};

// Hook for active cows only (for calf mother selection)
export const useActiveCows = () => {
  const { data: cows } = useQuery({
    queryKey: ['active-cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .eq('status', 'active');
      
      if (error) throw error;
      return sortCows(data as Cow[]);
    }
  });

  return { cows };
};

// Hook for AI tracking (includes dry and active, excludes sold/dead)
export const useAICows = () => {
  const { data: cows } = useQuery({
    queryKey: ['ai-cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .in('status', ['active', 'dry', 'pregnant', 'sick']);
      
      if (error) throw error;
      return sortCows(data as Cow[]);
    }
  });

  return { cows };
};

// Hook for vaccination (includes dry, sick, active - excludes pregnant, sold, dead)
export const useVaccinationCows = () => {
  const { data: cows } = useQuery({
    queryKey: ['vaccination-cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .in('status', ['active', 'dry', 'sick']);
      
      if (error) throw error;
      return sortCows(data as Cow[]);
    }
  });

  return { cows };
};

// Hook for weight logs (includes all except sold/dead)
export const useWeightLogCows = () => {
  const { data: cows } = useQuery({
    queryKey: ['weight-log-cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .in('status', ['active', 'dry', 'pregnant', 'sick']);
      
      if (error) throw error;
      return sortCows(data as Cow[]);
    }
  });

  return { cows };
};

// Hook for group assignments (includes all manageable cows)
export const useGroupAssignmentCows = () => {
  const { data: cows } = useQuery({
    queryKey: ['group-assignment-cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .in('status', ['active', 'dry', 'pregnant', 'sick']);
      
      if (error) throw error;
      return sortCows(data as Cow[]);
    }
  });

  return { cows };
};

// Hook for milk production (excludes dry and sold/dead)
export const useMilkingCows = () => {
  const { data: cows } = useQuery({
    queryKey: ['milking-cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .in('status', ['active', 'pregnant', 'sick']);
      
      if (error) throw error;
      return sortCows(data as Cow[]);
    }
  });

  return { cows };
};

// Backward compatibility - use active cows as default
export const useCows = useActiveCows;
