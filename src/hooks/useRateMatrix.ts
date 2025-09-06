import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RateResult {
  rate: number;
  effective_from: string;
}

export const useRateMatrix = () => {
  const getRateQuery = (species: string, fat: number, snf: number, date?: string) => {
    return useQuery({
      queryKey: ['rate-matrix', species, fat, snf, date],
      queryFn: async (): Promise<RateResult | null> => {
        const { data, error } = await supabase
          .rpc('fn_get_rate', {
            p_species: species,
            p_fat: fat,
            p_snf: snf,
            p_date: date || new Date().toISOString().split('T')[0]
          });

        if (error) {
          // Ignore error, return null to fallback to legacy rate
          return null;
        }

        // Handle case where no rate is found
        if (!data || data.length === 0 || !data[0].rate) {
          return null;
        }

        return data[0] as RateResult;
      },
      enabled: !!(species && fat > 0 && snf > 0),
      staleTime: 0, // Always fresh data after cache invalidation
    });
  };

  return {
    getRateQuery
  };
};