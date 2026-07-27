import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// 'rejected' means the matrix was found but this fat/SNF combination sits in an
// unpriced cell — the dairy will not buy it. It is not a Rs.0 rate.
export type RateSource = 'matrix' | 'clamped_high' | 'clamped_low' | 'rejected' | 'none';

export interface RateResult {
  rate: number | null;
  effective_from: string | null;
  source: RateSource;
  used_fat: number;
  used_snf: number;
}

// Species is derived from the rate matrix rather than configured thresholds:
// whichever species prices this sample is the species it is.
export interface ResolvedRate extends RateResult {
  species: string | null;
  ambiguous: boolean;
}

const today = () => new Date().toISOString().split('T')[0];

const mapRate = (row: any, fat: number, snf: number): RateResult => ({
  rate: row.rate ?? null,
  effective_from: row.effective_from ?? null,
  source: (row.source as RateSource) ?? 'none',
  used_fat: row.used_fat ?? fat,
  used_snf: row.used_snf ?? snf,
});

const mapResolved = (row: any, fat: number, snf: number): ResolvedRate => ({
  ...mapRate(row, fat, snf),
  species: row.species ?? null,
  ambiguous: row.ambiguous ?? false,
});

export const useRateMatrix = () => {
  const getRateQuery = (species: string, fat: number, snf: number, date?: string) => {
    return useQuery({
      queryKey: ['rate-matrix', species, fat, snf, date],
      queryFn: async (): Promise<RateResult | null> => {
        const { data, error } = await supabase.rpc('fn_get_rate', {
          p_species: species,
          p_fat: fat,
          p_snf: snf,
          p_date: date || today(),
        });

        if (error) return null;
        if (!data || data.length === 0) return null;

        return mapRate(data[0], fat, snf);
      },
      enabled: !!(species && fat > 0 && snf > 0),
      staleTime: 1000 * 60 * 5,
    });
  };

  // Species-agnostic lookup: resolves both the rate and the species from the matrix.
  const getResolvedRateQuery = (fat: number, snf: number, date?: string) => {
    return useQuery({
      queryKey: ['resolved-rate', fat, snf, date],
      queryFn: async (): Promise<ResolvedRate | null> => {
        const { data, error } = await (supabase.rpc as any)('fn_resolve_rate', {
          p_fat: fat,
          p_snf: snf,
          p_date: date || today(),
        });

        if (error) return null;
        if (!data || data.length === 0) return null;

        return mapResolved(data[0], fat, snf);
      },
      enabled: fat > 0 && snf > 0,
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
      p_date: date || today(),
    });
    if (error || !data || data.length === 0) return null;
    return mapRate(data[0], fat, snf);
  };

  const resolveRate = async (
    fat: number,
    snf: number,
    date?: string
  ): Promise<ResolvedRate | null> => {
    const { data, error } = await (supabase.rpc as any)('fn_resolve_rate', {
      p_fat: fat,
      p_snf: snf,
      p_date: date || today(),
    });
    if (error || !data || data.length === 0) return null;
    return mapResolved(data[0], fat, snf);
  };

  return { getRateQuery, getResolvedRateQuery, fetchRate, resolveRate };
};
