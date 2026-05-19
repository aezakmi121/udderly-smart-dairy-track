import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface SessionStat {
  qty: number;
  count: number;
}

export interface CollectionDay {
  qty: number;
  amount: number;
  count: number;
  farmers: number;
  morning: SessionStat;
  evening: SessionStat;
  avgFat: number;
  avgSnf: number;
}

export interface ProductionDay {
  qty: number;
  morning: number;
  evening: number;
  records: number;
}

export interface TrendPoint {
  date: string;
  label: string;
  collectionQty: number;
  productionQty: number;
}

export interface DashboardOverview {
  collection: { today: CollectionDay; yesterday: CollectionDay };
  production: { today: ProductionDay; yesterday: ProductionDay };
  trend: TrendPoint[];
  weekCollectionValue: number;
  counts: { cows: number; calves: number; farmers: number };
}

interface CollectionRow {
  collection_date: string;
  session: string;
  quantity: number | null;
  total_amount: number | null;
  fat_percentage: number | null;
  snf_percentage: number | null;
  farmer_id: string | null;
}

interface ProductionRow {
  production_date: string;
  session: string;
  quantity: number | null;
}

const num = (v: unknown): number => Number(v) || 0;

export const emptyCollectionDay = (): CollectionDay => ({
  qty: 0,
  amount: 0,
  count: 0,
  farmers: 0,
  morning: { qty: 0, count: 0 },
  evening: { qty: 0, count: 0 },
  avgFat: 0,
  avgSnf: 0,
});

export const emptyProductionDay = (): ProductionDay => ({
  qty: 0,
  morning: 0,
  evening: 0,
  records: 0,
});

function summarizeCollection(rows: CollectionRow[], date: string): CollectionDay {
  const day = rows.filter((r) => r.collection_date === date);
  if (day.length === 0) return emptyCollectionDay();
  const m = day.filter((r) => r.session === 'morning');
  const e = day.filter((r) => r.session === 'evening');
  const fat = day.filter((r) => r.fat_percentage != null);
  const snf = day.filter((r) => r.snf_percentage != null);
  return {
    qty: day.reduce((a, r) => a + num(r.quantity), 0),
    amount: day.reduce((a, r) => a + num(r.total_amount), 0),
    count: day.length,
    farmers: new Set(day.map((r) => r.farmer_id).filter(Boolean)).size,
    morning: { qty: m.reduce((a, r) => a + num(r.quantity), 0), count: m.length },
    evening: { qty: e.reduce((a, r) => a + num(r.quantity), 0), count: e.length },
    avgFat: fat.length ? fat.reduce((a, r) => a + num(r.fat_percentage), 0) / fat.length : 0,
    avgSnf: snf.length ? snf.reduce((a, r) => a + num(r.snf_percentage), 0) / snf.length : 0,
  };
}

function summarizeProduction(rows: ProductionRow[], date: string): ProductionDay {
  const day = rows.filter((r) => r.production_date === date);
  if (day.length === 0) return emptyProductionDay();
  const m = day
    .filter((r) => r.session === 'morning')
    .reduce((a, r) => a + num(r.quantity), 0);
  const e = day
    .filter((r) => r.session === 'evening')
    .reduce((a, r) => a + num(r.quantity), 0);
  return { qty: m + e, morning: m, evening: e, records: day.length };
}

export const useDashboardOverview = () => {
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard-overview'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
      const weekAgo = format(subDays(now, 6), 'yyyy-MM-dd');

      const [colRes, prodRes, cowsRes, calvesRes, farmersRes] = await Promise.allSettled([
        supabase
          .from('milk_collections')
          .select(
            'collection_date, session, quantity, total_amount, fat_percentage, snf_percentage, farmer_id',
          )
          .gte('collection_date', weekAgo),
        supabase
          .from('milk_production')
          .select('production_date, session, quantity')
          .gte('production_date', weekAgo),
        supabase.from('cows').select('*', { count: 'exact', head: true }),
        supabase.from('calves').select('*', { count: 'exact', head: true }),
        supabase.from('farmers').select('*', { count: 'exact', head: true }),
      ]);

      const colRows: CollectionRow[] =
        colRes.status === 'fulfilled' ? ((colRes.value.data as CollectionRow[]) ?? []) : [];
      const prodRows: ProductionRow[] =
        prodRes.status === 'fulfilled' ? ((prodRes.value.data as ProductionRow[]) ?? []) : [];

      const trend: TrendPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(now, i);
        const ds = format(d, 'yyyy-MM-dd');
        trend.push({
          date: ds,
          label: format(d, 'EEE'),
          collectionQty: colRows
            .filter((r) => r.collection_date === ds)
            .reduce((a, r) => a + num(r.quantity), 0),
          productionQty: prodRows
            .filter((r) => r.production_date === ds)
            .reduce((a, r) => a + num(r.quantity), 0),
        });
      }

      return {
        collection: {
          today: summarizeCollection(colRows, today),
          yesterday: summarizeCollection(colRows, yesterday),
        },
        production: {
          today: summarizeProduction(prodRows, today),
          yesterday: summarizeProduction(prodRows, yesterday),
        },
        trend,
        weekCollectionValue: colRows.reduce((a, r) => a + num(r.total_amount), 0),
        counts: {
          cows: cowsRes.status === 'fulfilled' ? cowsRes.value.count ?? 0 : 0,
          calves: calvesRes.status === 'fulfilled' ? calvesRes.value.count ?? 0 : 0,
          farmers: farmersRes.status === 'fulfilled' ? farmersRes.value.count ?? 0 : 0,
        },
      };
    },
  });
};
