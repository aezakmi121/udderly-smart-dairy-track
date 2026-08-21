import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAdvanceSummary, type AdvanceSummaryRow } from '@/hooks/usePayouts';
import { Plus, Loader2, Search, ChevronRight } from 'lucide-react';

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr = (n: number) => `₹${inrFmt.format(Math.round(n))}`;

/** "1 Aug – 15 Aug" from a cycle's two dates. */
const cycleLabel = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const d = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${d(start)} – ${d(end)}`;
};

export const AdvancesTab: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('farmers').select('id, name, farmer_code').eq('is_active', true).order('farmer_code');
      if (error) throw error;
      return data;
    },
  });

  const { data: summary = [], isLoading } = useAdvanceSummary();

  const farmerById = useMemo(
    () => new Map(farmers.map((f) => [f.id, f])),
    [farmers]
  );

  // Biggest debt first: that is the one you are asked about.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summary
      .map((s) => ({ ...s, farmer: farmerById.get(s.farmer_id) }))
      .filter((s) => {
        if (!q) return true;
        return s.farmer?.name?.toLowerCase().includes(q)
          || s.farmer?.farmer_code?.toLowerCase().includes(q);
      })
      .sort((a, b) => Number(b.outstanding) - Number(a.outstanding));
  }, [summary, farmerById, search]);

  const herdTotal = rows.reduce((n, r) => n + Number(r.outstanding), 0);

  const [farmerId, setFarmerId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!farmerId || !amount) throw new Error('Select farmer & amount');
      const { error } = await supabase.from('farmer_advances').insert({
        farmer_id: farmerId, amount: Number(amount), advance_date: date, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Advance added' });
      setAmount(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['advance-summary'] });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> New advance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Farmer</Label>
            <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className="w-full h-10 border rounded px-2 text-sm bg-background">
              <option value="">Select farmer…</option>
              {farmers.map((f) => <option key={f.id} value={f.id}>{f.farmer_code} · {f.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Amount ₹</Label>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <Label className="text-xs">Note</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add advance
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span>Outstanding advances</span>
            <span className="text-base font-bold">{inr(herdTotal)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search farmer or code" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
          {!isLoading && rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {search ? `Nobody matches "${search}".` : 'No farmer is carrying an advance.'}
            </p>
          )}
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {rows.map((r) => <FarmerAdvanceRow key={r.farmer_id} row={r} farmer={r.farmer} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * One farmer's position: what is left, and what came off it last. Opening the
 * row shows every recovery, so "when did we last take anything off him" is
 * answered without leaving the page.
 */
const FarmerAdvanceRow: React.FC<{
  row: AdvanceSummaryRow;
  farmer?: { name: string; farmer_code: string };
}> = ({ row, farmer }) => {
  const [open, setOpen] = useState(false);
  const last = cycleLabel(row.last_deducted_cycle_start, row.last_deducted_cycle_end);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded">
      <CollapsibleTrigger className="w-full p-2 text-left text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex items-start gap-1">
            <ChevronRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
            <div className="min-w-0">
              <div className="font-medium truncate">{farmer?.farmer_code} · {farmer?.name}</div>
              <div className="text-muted-foreground">
                Took {inr(Number(row.total_taken))}
                {row.last_deducted_amount != null
                  ? ` · last deducted ${inr(Number(row.last_deducted_amount))}${last ? ` (${last})` : ''}`
                  : ' · nothing deducted yet'}
              </div>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-700 shrink-0">{inr(Number(row.outstanding))} left</Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {open && <RecoveryHistory farmerId={row.farmer_id} />}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface RecoveryRow {
  id: string;
  amount: number;
  created_at: string;
  farmer_payouts: {
    bill_number: string | null;
    farmer_payout_cycles: { cycle_start: string; cycle_end: string } | null;
  } | null;
}

const RecoveryHistory: React.FC<{ farmerId: string }> = ({ farmerId }) => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['advance-recoveries', farmerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmer_advance_recoveries')
        .select('id, amount, created_at, farmer_advances!inner(farmer_id, advance_date, amount), farmer_payouts(bill_number, farmer_payout_cycles(cycle_start, cycle_end))')
        .eq('farmer_advances.farmer_id', farmerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RecoveryRow[];
    },
  });

  if (isLoading) return <div className="p-3"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>;
  if (data.length === 0) {
    return <p className="px-3 pb-3 text-[11px] text-muted-foreground">Nothing has been recovered yet.</p>;
  }

  return (
    <div className="px-3 pb-3 space-y-1 border-t pt-2">
      {data.map((r) => {
        const c = r.farmer_payouts?.farmer_payout_cycles ?? null;
        return (
          <div key={r.id} className="flex justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground truncate">
              {cycleLabel(c?.cycle_start ?? null, c?.cycle_end ?? null) ?? r.farmer_payouts?.bill_number ?? '—'}
            </span>
            <span className="font-medium">−{inr(Number(r.amount))}</span>
          </div>
        );
      })}
    </div>
  );
};
