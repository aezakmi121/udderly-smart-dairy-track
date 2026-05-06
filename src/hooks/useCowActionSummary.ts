import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CowActionSummary {
  pdDue: number;
  closeToDelivery: number;
  overdueDelivery: number;
  needsAI: number;
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export const useCowActionSummary = () => {
  return useQuery({
    queryKey: ['cow-action-summary'],
    queryFn: async (): Promise<CowActionSummary> => {
      const today = new Date().toISOString().split('T')[0];
      const sixtyDaysAgo = daysAgo(60);
      const sixtyDaysAhead = daysAhead(60);

      const sb: any = supabase;
      const [pdDueRes, closeRes, overdueRes, allActiveRes, latestPregRes] = await Promise.allSettled([
        // PD Due: AI done >=60 days ago, no PD result yet
        sb
          .from('ai_records')
          .select('id', { count: 'exact', head: true })
          .lte('ai_date', sixtyDaysAgo)
          .eq('pd_done', false),
        // Close to delivery (next 60 days, not delivered yet)
        sb
          .from('ai_records')
          .select('id', { count: 'exact', head: true })
          .eq('pd_result', 'positive')
          .is('actual_delivery_date', null)
          .gte('expected_delivery_date', today)
          .lte('expected_delivery_date', sixtyDaysAhead),
        // Overdue delivery
        sb
          .from('ai_records')
          .select('id', { count: 'exact', head: true })
          .eq('pd_result', 'positive')
          .is('actual_delivery_date', null)
          .lt('expected_delivery_date', today),
        // Active cows count
        sb
          .from('cows')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        // Cows that have an active pregnancy (positive PD, not delivered)
        sb
          .from('ai_records')
          .select('cow_id')
          .eq('pd_result', 'positive')
          .is('actual_delivery_date', null),
      ]);

      const pdDue = pdDueRes.status === 'fulfilled' ? (pdDueRes.value.count ?? 0) : 0;
      const closeToDelivery = closeRes.status === 'fulfilled' ? (closeRes.value.count ?? 0) : 0;
      const overdueDelivery = overdueRes.status === 'fulfilled' ? (overdueRes.value.count ?? 0) : 0;

      // Needs AI: active cows minus those currently pregnant (rough heuristic)
      const totalActive = allActiveRes.status === 'fulfilled' ? (allActiveRes.value.count ?? 0) : 0;
      const pregnantCowIds = new Set<string>();
      if (latestPregRes.status === 'fulfilled' && latestPregRes.value.data) {
        for (const r of latestPregRes.value.data as Array<{ cow_id: string }>) {
          if (r.cow_id) pregnantCowIds.add(r.cow_id);
        }
      }
      const needsAI = Math.max(0, totalActive - pregnantCowIds.size);

      return { pdDue, closeToDelivery, overdueDelivery, needsAI };
    },
    staleTime: 5 * 60 * 1000,
  });
};
