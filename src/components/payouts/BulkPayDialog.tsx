import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PayoutRow } from '@/hooks/usePayouts';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const METHODS = [
  { id: 'cash', label: 'Cash' }, { id: 'upi', label: 'UPI' },
  { id: 'cheque', label: 'Cheque' }, { id: 'bank_transfer', label: 'Bank' },
];

interface Props { rows: PayoutRow[]; open: boolean; onOpenChange: (v: boolean) => void; }

export const BulkPayDialog: React.FC<Props> = ({ rows, open, onOpenChange }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const unpaid = useMemo(() => rows.filter((r) => Number(r.net_payable) - Number(r.paid_amount) > 0), [rows]);
  const [selected, setSelected] = useState<Set<string>>(new Set(unpaid.map((r) => r.id)));
  const [method, setMethod] = useState('cash');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const items = unpaid.filter((r) => selected.has(r.id))
    .map((r) => ({ payout_id: r.id, amount: Number(r.net_payable) - Number(r.paid_amount) }));
  const total = items.reduce((s, i) => s + i.amount, 0);

  const submit = async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('bulk-record-payments', {
        body: { items, method, paid_on: paidOn },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Bulk paid', description: `${items.length} bills · ${inr(total)}` });
      qc.invalidateQueries({ queryKey: ['cycle-payouts'] });
      qc.invalidateQueries({ queryKey: ['payout-cycles'] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bulk pay (full amounts)</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Method</Label>
              <div className="grid grid-cols-4 gap-1">
                {METHODS.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                    className={`h-9 rounded border text-xs ${method === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>
          <div className="border rounded max-h-72 overflow-y-auto divide-y">
            {unpaid.map((r) => {
              const remaining = Number(r.net_payable) - Number(r.paid_amount);
              const checked = selected.has(r.id);
              return (
                <label key={r.id} className="flex items-center gap-2 p-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={(e) => {
                    const s = new Set(selected);
                    e.target.checked ? s.add(r.id) : s.delete(r.id);
                    setSelected(s);
                  }} />
                  <span className="flex-1 truncate">{r.farmers?.farmer_code} · {r.farmers?.name}</span>
                  <span className="font-semibold">{inr(remaining)}</span>
                </label>
              );
            })}
            {!unpaid.length && <div className="p-3 text-center text-muted-foreground text-xs">All paid</div>}
          </div>
          <div className="text-right text-sm font-semibold">{items.length} bills · {inr(total)}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !items.length}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Confirm pay {inr(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function downloadPaymentRegisterCsv(cycleLabel: string, rows: PayoutRow[]) {
  const header = ['Bill #', 'Farmer Code', 'Farmer Name', 'Phone', 'Net Payable', 'Already Paid', 'Remaining', 'Signature'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const remaining = Number(r.net_payable) - Number(r.paid_amount);
    const cells = [
      r.bill_number ?? '', r.farmers?.farmer_code ?? '', `"${(r.farmers?.name ?? '').replace(/"/g, '""')}"`,
      r.farmers?.phone_number ?? '', String(Math.round(Number(r.net_payable))),
      String(Math.round(Number(r.paid_amount))), String(Math.round(remaining)), '',
    ];
    lines.push(cells.join(','));
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `payment-register-${cycleLabel}.csv`; a.click();
  URL.revokeObjectURL(url);
}
