import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PayoutRow } from '@/hooks/usePayouts';
import { formatINR, parseAmount, roundToPaise } from '@/lib/money';

const METHODS: Array<{ id: string; label: string }> = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'bank_transfer', label: 'Bank' },
];

interface Props {
  payout: PayoutRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const PaymentDialog: React.FC<Props> = ({ payout, open, onOpenChange }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const remaining = roundToPaise(Math.max(Number(payout.net_payable) - Number(payout.paid_amount), 0));
  const [amount, setAmount] = useState<string>(String(remaining));
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Idempotency key — regenerated each time the dialog opens. Network retries
  // of the same submit() carry the same key so the server deduplicates.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  useEffect(() => {
    if (open) {
      setIdempotencyKey(crypto.randomUUID());
      setAmount(String(remaining));
    }
    // remaining intentionally omitted: only reset when dialog transitions to open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Atomic guard against double-clicks before React state propagates.
  const submitInFlight = useRef(false);

  const amt = parseAmount(amount);
  const isPartial = amt > 0 && amt < remaining;

  const submit = async (closePartial: boolean) => {
    if (submitInFlight.current || busy) return;
    if (amt <= 0) {
      toast({ title: 'Enter amount', variant: 'destructive' });
      return;
    }
    submitInFlight.current = true;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('record-payment-event', {
        body: {
          payout_id: payout.id,
          amount: amt,
          method,
          reference: reference || null,
          paid_on: paidOn,
          note: note || null,
          close_partial: closePartial,
          idempotency_key: idempotencyKey,
        },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
      toast({ title: 'Payment recorded', description: `${formatINR(amt)} via ${method}` });
      qc.invalidateQueries({ queryKey: ['cycle-payouts'] });
      qc.invalidateQueries({ queryKey: ['payout-cycles'] });
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Payment failed';
      toast({ title: 'Failed', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
      submitInFlight.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Mark Payment — {payout.farmers?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Bill" value={formatINR(Number(payout.net_payable))} />
            <Stat label="Paid" value={formatINR(Number(payout.paid_amount))} />
            <Stat label="Remaining" value={formatINR(remaining)} highlight />
          </div>

          <div>
            <Label className="text-xs">Amount paying</Label>
            <div className="flex gap-2">
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="text-base"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => setAmount(String(remaining))}>Full</Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Method</Label>
            <div className="grid grid-cols-4 gap-1">
              {METHODS.map((m) => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                  className={`h-9 rounded border text-xs font-medium ${method === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Reference (optional)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI / cheque #" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {isPartial && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
              <strong>Partial payment.</strong> {formatINR(remaining - amt)} रहेगा। If you close this bill, the remaining amount will be added to next cycle's bill as carry-forward.
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          {isPartial && (
            <Button variant="secondary" onClick={() => submit(true)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Pay & Close (carry forward)
            </Button>
          )}
          <Button onClick={() => submit(false)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Stat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`rounded border p-2 text-center ${highlight ? 'bg-primary/5 border-primary/40' : ''}`}>
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className={`font-bold text-xs ${highlight ? 'text-primary' : ''}`}>{value}</div>
  </div>
);
