import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { usePayoutCycles, useCyclePayouts, useCurrentCycleLive, type PayoutCycle, type PayoutRow } from '@/hooks/usePayouts';
import { PaymentDialog } from './PaymentDialog';
import { AdvancesTab } from './AdvancesTab';
import { BulkPayDialog, downloadPaymentRegisterCsv } from './BulkPayDialog';
import { Wallet, FileText, CheckCircle2, Loader2, Hourglass, Search, Receipt, Download, Users } from 'lucide-react';

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr = (n: number) => `₹${inrFmt.format(Math.round(n))}`;

const statusBadge = (s: PayoutCycle['status']) => {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: 'Open · चल रहा', cls: 'bg-blue-100 text-blue-700' },
    closed_for_collection: { label: 'Reconciliation', cls: 'bg-amber-100 text-amber-700' },
    drafted: { label: 'Drafted', cls: 'bg-purple-100 text-purple-700' },
    finalized: { label: 'Finalized · Pay', cls: 'bg-green-100 text-green-700' },
    fully_paid: { label: 'Fully Paid', cls: 'bg-gray-100 text-gray-700' },
  };
  const v = map[s] ?? { label: s, cls: '' };
  return <Badge className={v.cls} variant="secondary">{v.label}</Badge>;
};

export const PayoutsManagement: React.FC = () => {
  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: cycles = [], isLoading } = usePayoutCycles();
  const [busy, setBusy] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const currentCycle = cycles.find((c) => c.cycle_start <= today && c.cycle_end >= today);
  const reconCycles = cycles.filter((c) => c.status === 'closed_for_collection' || c.status === 'drafted');
  const payCycles = cycles.filter((c) => c.status === 'finalized');
  const historyCycles = cycles.filter((c) => c.status === 'fully_paid');

  const callFn = async (fn: string, body: any) => {
    setBusy(fn);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke(fn, {
        body, headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Done', description: JSON.stringify(data) });
      qc.invalidateQueries({ queryKey: ['payout-cycles'] });
      qc.invalidateQueries({ queryKey: ['cycle-payouts'] });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 p-3 sm:p-6 max-w-7xl mx-auto">
      <header className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Farmer Payouts</h1>
          <p className="text-xs text-muted-foreground">Fortnightly cycles · 1–15 and 16–end</p>
        </div>
      </header>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid grid-cols-5 w-full h-auto">
          <TabsTrigger value="current" className="text-xs px-1 py-2">Current</TabsTrigger>
          <TabsTrigger value="recon" className="text-xs px-1 py-2">Recon</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs px-1 py-2 font-semibold">Payments</TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-1 py-2">History</TabsTrigger>
          <TabsTrigger value="advances" className="text-xs px-1 py-2" disabled={!isAdmin}>Advances</TabsTrigger>
        </TabsList>

        {/* CURRENT */}
        <TabsContent value="current" className="space-y-3">
          {currentCycle ? (
            <CurrentCyclePanel cycle={currentCycle} />
          ) : (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No open cycle. <Button size="sm" className="ml-2" onClick={() => callFn('rollover-payout-cycle', {})} disabled={!!busy}>Run rollover</Button></CardContent></Card>
          )}
        </TabsContent>

        {/* RECONCILIATION */}
        <TabsContent value="recon" className="space-y-3">
          {reconCycles.length === 0 ? (
            <EmptyState text="No cycles in reconciliation." />
          ) : reconCycles.map((c) => (
            <ReconciliationCard key={c.id} cycle={c} isAdmin={isAdmin} busy={busy} onAction={callFn} />
          ))}
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments" className="space-y-3">
          {payCycles.length === 0 ? (
            <EmptyState text="No finalized cycles waiting for payment." />
          ) : payCycles.map((c) => <PaymentsCard key={c.id} cycle={c} />)}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-3">
          {historyCycles.length === 0 ? (
            <EmptyState text="No fully paid cycles yet." />
          ) : historyCycles.map((c) => (
            <Card key={c.id}>
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center justify-between">
                <span>{c.cycle_start} → {c.cycle_end}</span>{statusBadge(c.status)}</CardTitle></CardHeader>
              <CardContent className="pt-0"><HistoryRows cycleId={c.id} /></CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="advances">
          {isAdmin && <AdvancesTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">{text}</CardContent></Card>
);

const CurrentCyclePanel: React.FC<{ cycle: PayoutCycle }> = ({ cycle }) => {
  const { data: live = [], isLoading } = useCurrentCycleLive(cycle);
  const total = live.reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span>{cycle.cycle_start} → {cycle.cycle_end}</span>{statusBadge(cycle.status)}</CardTitle></CardHeader>
        <CardContent className="pt-0 grid grid-cols-3 gap-2 text-center">
          <Stat label="Farmers" value={String(live.length)} />
          <Stat label="Sessions" value={String(live.reduce((s, r) => s + r.sessions, 0))} />
          <Stat label="Live ₹" value={inr(total)} highlight />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Live per-farmer</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
          {live.map((r) => (
            <div key={r.farmer_id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.code} · {r.name}</div>
                <div className="text-xs text-muted-foreground">{r.qty.toFixed(1)} L · {r.sessions} sessions</div>
              </div>
              <div className="font-semibold">{inr(r.amount)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};

const Stat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`rounded-lg border p-2 ${highlight ? 'bg-primary/5 border-primary/40' : ''}`}>
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className={`font-bold ${highlight ? 'text-primary text-base' : 'text-sm'}`}>{value}</div>
  </div>
);

const ReconciliationCard: React.FC<{ cycle: PayoutCycle; isAdmin: boolean; busy: string | null; onAction: (fn: string, body: any) => void }> = ({ cycle, isAdmin, busy, onAction }) => {
  const { data: payouts = [] } = useCyclePayouts(cycle.id);
  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
        <span>{cycle.cycle_start} → {cycle.cycle_end}</span>{statusBadge(cycle.status)}</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          {isAdmin && cycle.status !== 'finalized' && (
            <Button size="sm" disabled={!!busy} onClick={() => onAction('generate-payout-cycle', { cycle_id: cycle.id })}>
              {busy === 'generate-payout-cycle' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Hourglass className="h-4 w-4 mr-1" />}
              Generate Bills
            </Button>
          )}
          {isAdmin && cycle.status === 'drafted' && (
            <Button size="sm" variant="default" disabled={!!busy} onClick={() => {
              if (confirm('Finalize this cycle? Bill numbers will be assigned and farmers will be notified.')) onAction('finalize-payout-cycle', { cycle_id: cycle.id });
            }}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Finalize Cycle
            </Button>
          )}
        </div>
        {payouts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{payouts.length} draft bills · Total {inr(payouts.reduce((s, p) => s + Number(p.net_payable), 0))}</div>
            <div className="max-h-[50vh] overflow-y-auto space-y-1">
              {payouts.map((p) => <DraftRow key={p.id} p={p} />)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DraftRow: React.FC<{ p: PayoutRow }> = ({ p }) => (
  <div className="border rounded p-2 text-xs">
    <div className="flex justify-between gap-2">
      <span className="font-medium truncate">{p.farmers?.farmer_code} · {p.farmers?.name}</span>
      <span className="font-bold">{inr(Number(p.net_payable))}</span>
    </div>
    <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3">
      <span>{Number(p.total_quantity).toFixed(1)} L</span>
      <span>Milk {inr(Number(p.total_amount))}</span>
      {Number(p.advances_deducted) > 0 && <span className="text-orange-700">−Adv {inr(Number(p.advances_deducted))}</span>}
      {Number(p.carry_forward_in) > 0 && <span className="text-red-700">+CF {inr(Number(p.carry_forward_in))}</span>}
    </div>
  </div>
);

const PaymentsCard: React.FC<{ cycle: PayoutCycle }> = ({ cycle }) => {
  const { data: payouts = [], isLoading } = useCyclePayouts(cycle.id);
  const [filter, setFilter] = useState('');
  const [showPaid, setShowPaid] = useState(false);
  const [payRow, setPayRow] = useState<PayoutRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = useMemo(() => {
    return payouts.filter((p) => {
      if (!showPaid && p.status === 'paid' && Number(p.unpaid_balance) === 0) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return p.farmers?.name?.toLowerCase().includes(q) || p.farmers?.farmer_code?.toLowerCase().includes(q) || p.bill_number?.toLowerCase().includes(q);
    });
  }, [payouts, filter, showPaid]);

  const unpaidTotal = filtered.reduce((s, p) => s + (Number(p.net_payable) - Number(p.paid_amount)), 0);
  const cycleLabel = `${cycle.cycle_start}_${cycle.cycle_end}`;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span>{cycle.cycle_start} → {cycle.cycle_end}</span>{statusBadge(cycle.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search farmer/code/bill" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <Button size="sm" variant={showPaid ? 'default' : 'outline'} onClick={() => setShowPaid((v) => !v)}>
            {showPaid ? 'Hide paid' : 'Show paid'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <Users className="h-4 w-4 mr-1" /> Bulk pay
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadPaymentRegisterCsv(cycleLabel, filtered)}>
            <Download className="h-4 w-4 mr-1" /> Register CSV
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} bills · Outstanding {inr(unpaidTotal)}</div>
        {isLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((p) => (<PayRow key={p.id} p={p} onPay={() => setPayRow(p)} />))}
        </div>
      </CardContent>
      {payRow && <PaymentDialog payout={payRow} open={!!payRow} onOpenChange={(o) => !o && setPayRow(null)} />}
      {bulkOpen && <BulkPayDialog rows={filtered} open={bulkOpen} onOpenChange={setBulkOpen} />}
    </Card>
  );
};

const PayRow: React.FC<{ p: PayoutRow; onPay: () => void }> = ({ p, onPay }) => {
  const remaining = Math.max(Number(p.net_payable) - Number(p.paid_amount), 0);
  const fullyPaid = remaining === 0 && Number(p.paid_amount) > 0;
  return (
    <div className="border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{p.farmers?.farmer_code} · {p.farmers?.name}</div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
          <span>{p.bill_number ?? '—'}</span>
          <span>{p.farmers?.phone_number}</span>
          {Number(p.advances_deducted) > 0 && <span>Adv {inr(Number(p.advances_deducted))}</span>}
          {Number(p.carry_forward_in) > 0 && <span className="text-red-700">CF {inr(Number(p.carry_forward_in))}</span>}
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3">
        <div className="text-right">
          <div className="font-bold">{inr(remaining)}</div>
          {Number(p.paid_amount) > 0 && <div className="text-[10px] text-muted-foreground">paid {inr(Number(p.paid_amount))} / {inr(Number(p.net_payable))}</div>}
        </div>
        {fullyPaid ? (
          <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>
        ) : (
          <Button size="sm" onClick={onPay}><Receipt className="h-4 w-4 mr-1" /> Pay</Button>
        )}
      </div>
    </div>
  );
};

const HistoryRows: React.FC<{ cycleId: string }> = ({ cycleId }) => {
  const { data: payouts = [] } = useCyclePayouts(cycleId);
  return (
    <div className="space-y-1 max-h-72 overflow-y-auto">
      {payouts.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-xs border rounded p-2">
          <span className="truncate">{p.farmers?.farmer_code} · {p.farmers?.name}</span>
          <span className="text-muted-foreground">{p.paid_on}</span>
          <span className="font-medium">{inr(Number(p.paid_amount))}</span>
        </div>
      ))}
    </div>
  );
};
