import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RateSource = 'matrix' | 'clamped_high' | 'clamped_low' | 'none';

export interface RateResult {
  rate: number | null;
  effective_from: string | null;
  source: RateSource;
  used_fat: number;
  used_snf: number;
}

export const useRateMatrix = () => {
  const getRateQuery = (species: string, fat: number, snf: number, date?: string) => {
    return useQuery({
      queryKey: ['rate-matrix', species, fat, snf, date],
      queryFn: async (): Promise<RateResult | null> => {
        const { data, error } = await supabase.rpc('fn_get_rate', {
          p_species: species,
          p_fat: fat,
          p_snf: snf,
          p_date: date || new Date().toISOString().split('T')[0],
        });

        if (error) return null;
        if (!data || data.length === 0) return null;

        const row = data[0] as any;
        return {
          rate: row.rate ?? null,
          effective_from: row.effective_from ?? null,
          source: (row.source as RateSource) ?? 'none',
          used_fat: row.used_fat ?? fat,
          used_snf: row.used_snf ?? snf,
        };
      },
      enabled: !!(species && fat > 0 && snf > 0),
      staleTime: 1000 * 60 * 5,
    });
  };

  // Direct (non-hook) lookup for batch use (e.g. slip scanner review)
  const fetchRate = async (
    species: string,
    fat: number,
    snf: number,
    date?: string
  ): Promise<RateResult | null> => {
    const { data, error } = await supabase.rpc('fn_get_rate', {
      p_species: species,
      p_fat: fat,
      p_snf: snf,
      p_date: date || new Date().toISOString().split('T')[0],
    });
    if (error || !data || data.length === 0) return null;
    const row = data[0] as any;
    return {
      rate: row.rate ?? null,
      effective_from: row.effective_from ?? null,
      source: (row.source as RateSource) ?? 'none',
      used_fat: row.used_fat ?? fat,
      used_snf: row.used_snf ?? snf,
    };
  };

  return { getRateQuery, fetchRate };
};
