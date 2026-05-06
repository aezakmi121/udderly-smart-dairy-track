import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActionCategory = 'pd-due' | 'close-delivery' | 'overdue-delivery' | 'needs-ai';

export interface ActionDetailRow {
  id: string;
  cowNumber: string;
  primaryDate?: string; // AI date / expected delivery / last delivery
  primaryLabel: string;
  daysValue: number;
  daysLabel: string;
}

const today = () => new Date().toISOString().split('T')[0];
const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);

export const useCowActionDetails = (category: ActionCategory | null) => {
  return useQuery({
    queryKey: ['cow-action-details', category],
    enabled: !!category,
    queryFn: async (): Promise<ActionDetailRow[]> => {
      const sb: any = supabase;
      const t = today();

      if (category === 'pd-due') {
        const { data, error } = await sb
          .from('ai_records')
          .select('id, ai_date, cows!ai_records_cow_id_fkey(cow_number)')
          .eq('pd_done', false)
          .lte('ai_date', new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0])
          .order('ai_date', { ascending: true });
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          cowNumber: r.cows?.cow_number ?? '—',
          primaryDate: r.ai_date,
          primaryLabel: 'AI on',
          daysValue: daysBetween(r.ai_date, t),
          daysLabel: 'days since AI',
        }));
      }

      if (category === 'close-delivery') {
        const ahead = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb
          .from('ai_records')
          .select('id, expected_delivery_date, cows!ai_records_cow_id_fkey(cow_number)')
          .eq('pd_result', 'positive')
          .is('actual_delivery_date', null)
          .gte('expected_delivery_date', t)
          .lte('expected_delivery_date', ahead)
          .order('expected_delivery_date', { ascending: true });
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          cowNumber: r.cows?.cow_number ?? '—',
          primaryDate: r.expected_delivery_date,
          primaryLabel: 'Expected',
          daysValue: daysBetween(t, r.expected_delivery_date),
          daysLabel: 'days to go',
        }));
      }

      if (category === 'overdue-delivery') {
        const { data, error } = await sb
          .from('ai_records')
          .select('id, expected_delivery_date, cows!ai_records_cow_id_fkey(cow_number)')
          .eq('pd_result', 'positive')
          .is('actual_delivery_date', null)
          .lt('expected_delivery_date', t)
          .order('expected_delivery_date', { ascending: true });
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          cowNumber: r.cows?.cow_number ?? '—',
          primaryDate: r.expected_delivery_date,
          primaryLabel: 'Expected',
          daysValue: daysBetween(r.expected_delivery_date, t),
          daysLabel: 'days overdue',
        }));
      }

      // needs-ai: active cows that don't have an open pregnancy
      const { data: cows, error: cowErr } = await sb
        .from('cows')
        .select('id, cow_number, last_calving_date')
        .eq('is_active', true);
      if (cowErr) throw cowErr;

      const { data: preg } = await sb
        .from('ai_records')
        .select('cow_id')
        .eq('pd_result', 'positive')
        .is('actual_delivery_date', null);
      const pregSet = new Set<string>((preg || []).map((r: any) => r.cow_id).filter(Boolean));

      const rows: ActionDetailRow[] = (cows || [])
        .filter((c: any) => !pregSet.has(c.id))
        .map((c: any) => ({
          id: c.id,
          cowNumber: c.cow_number ?? '—',
          primaryDate: c.last_calving_date ?? undefined,
          primaryLabel: c.last_calving_date ? 'Last calving' : 'No calving record',
          daysValue: c.last_calving_date ? daysBetween(c.last_calving_date, t) : 9999,
          daysLabel: c.last_calving_date ? 'days since' : '',
        }))
        .sort((a, b) => b.daysValue - a.daysValue);

      return rows;
    },
    staleTime: 2 * 60 * 1000,
  });
};
