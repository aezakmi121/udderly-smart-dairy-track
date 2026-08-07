import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PayoutCycle {
  id: string;
  cycle_start: string;
  cycle_end: string;
  half: 'first' | 'second';
  year_month: string;
  status: 'open' | 'closed_for_collection' | 'drafted' | 'finalized' | 'fully_paid';
  finalized_at: string | null;
  fully_paid_at: string | null;
}

export interface PayoutRow {
  id: string;
  cycle_id: string;
  farmer_id: string;
  bill_number: string | null;
  total_quantity: number;
  total_amount: number;
  sessions_count: number;
  avg_fat: number | null;
  avg_snf: number | null;
  advances_deducted: number;
  carry_forward_in: number;
  other_deductions: number;
  net_payable: number;
  paid_amount: number;
  unpaid_balance: number;
  status: 'draft' | 'finalized' | 'paid' | 'void';
  paid_on: string | null;
  last_payment_method: string | null;
  finalized_at: string | null;
  pdf_storage_path: string | null;
  farmers?: { name: string; farmer_code: string; phone_number: string; portal_token?: string | null };
}

export const usePayoutCycles = () => useQuery({
  queryKey: ['payout-cycles'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('farmer_payout_cycles')
      .select('*')
      .order('cycle_start', { ascending: false })
      .limit(24);
    if (error) throw error;
    return data as PayoutCycle[];
  },
});

export const useCyclePayouts = (cycleId: string | null) => useQuery({
  queryKey: ['cycle-payouts', cycleId],
  enabled: !!cycleId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('farmer_payouts')
      .select('*')
      .eq('cycle_id', cycleId!)
      .order('bill_number', { ascending: true, nullsFirst: false });
    if (error) throw error;
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.farmer_id)));
    if (ids.length === 0) return [] as PayoutRow[];
    const { data: farmers } = await supabase.from('farmers')
      .select('id, name, farmer_code, phone_number, portal_token').in('id', ids);
    const fmap = new Map((farmers ?? []).map((f) => [f.id, f]));
    return rows.map((r) => ({ ...r, farmers: fmap.get(r.farmer_id) })) as PayoutRow[];
  },
});

export const useCurrentCycleLive = (cycle: PayoutCycle | null | undefined) => useQuery({
  queryKey: ['cycle-live', cycle?.id],
  enabled: !!cycle,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('milk_collections')
      .select('farmer_id, quantity, total_amount')
      .gte('collection_date', cycle!.cycle_start)
      .lte('collection_date', cycle!.cycle_end)
      .eq('is_accepted', true);
    if (error) throw error;
    const map = new Map<string, { farmer_id: string; qty: number; amount: number; sessions: number }>();
    for (const r of (data ?? []) as any[]) {
      if (!r.farmer_id) continue;
      const cur = map.get(r.farmer_id) ?? { farmer_id: r.farmer_id, qty: 0, amount: 0, sessions: 0 };
      cur.qty += Number(r.quantity ?? 0);
      cur.amount += Number(r.total_amount ?? 0);
      cur.sessions += 1;
      map.set(r.farmer_id, cur);
    }
    const ids = Array.from(map.keys());
    const { data: farmers } = ids.length
      ? await supabase.from('farmers').select('id, name, farmer_code, phone_number').in('id', ids)
      : { data: [] as any[] };
    const fmap = new Map((farmers ?? []).map((f: any) => [f.id, f]));
    return Array.from(map.values()).map((r) => {
      const f = fmap.get(r.farmer_id);
      return { ...r, name: f?.name ?? '', code: f?.farmer_code ?? '', phone: f?.phone_number ?? '' };
    }).sort((a, b) => a.code.localeCompare(b.code));
  },
});
