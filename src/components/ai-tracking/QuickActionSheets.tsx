import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, HelpCircle } from 'lucide-react';
import type { CowSummary } from '@/lib/pdUtils';
import { formatDMY } from '@/lib/breedingDisplay';

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type PdResult = 'positive' | 'negative' | 'inconclusive';

/**
 * Recording a pregnancy check from the board.
 *
 * A sheet rather than a dialog: it rises from the bottom, within thumb reach on
 * a phone held one-handed. The three results are full-height buttons rather
 * than a dropdown, because a dropdown in a shed with gloves on is a fight.
 */
export const QuickPdSheet: React.FC<{
  cow: CowSummary | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (cow: CowSummary, result: PdResult, examinedOn: string) => void;
}> = ({ cow, busy, onClose, onSave }) => {
  const [result, setResult] = useState<PdResult | null>(null);
  const [examinedOn, setExaminedOn] = useState(todayISO());

  useEffect(() => {
    if (cow) {
      setResult((cow.aiRecord.pd_result as PdResult) ?? null);
      setExaminedOn(cow.pdDate ?? todayISO());
    }
  }, [cow]);

  if (!cow) return null;

  const options: Array<{ value: PdResult; label: string; icon: React.ReactNode; tone: string }> = [
    { value: 'positive', label: 'Pregnant', icon: <Check className="h-5 w-5" />, tone: 'data-[on=true]:bg-green-600 data-[on=true]:text-white' },
    { value: 'negative', label: 'Empty', icon: <X className="h-5 w-5" />, tone: 'data-[on=true]:bg-red-600 data-[on=true]:text-white' },
    { value: 'inconclusive', label: 'Not sure', icon: <HelpCircle className="h-5 w-5" />, tone: 'data-[on=true]:bg-amber-500 data-[on=true]:text-white' },
  ];

  return (
    <Sheet open={!!cow} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>
            Cow #{cow.cowNumber} — pregnancy check
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Service #{cow.serviceNumber}, served {formatDMY(cow.latestAIDate)}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-6">
          <div className="grid grid-cols-3 gap-2">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                data-on={result === o.value}
                onClick={() => setResult(o.value)}
                className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm font-medium data-[on=true]:border-transparent ${o.tone}`}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="pd-examined">Date examined</Label>
            <Input
              id="pd-examined"
              type="date"
              className="h-12 text-base"
              value={examinedOn}
              max={todayISO()}
              onChange={(e) => setExaminedOn(e.target.value)}
            />
            {/* Stamping today regardless is what made the stored PD dates
                useless for working out when checks actually happen. */}
            <p className="mt-1 text-xs text-muted-foreground">
              When the vet checked her. Defaults to today.
            </p>
          </div>

          <Button
            className="h-14 w-full text-base"
            disabled={!result || busy}
            onClick={() => result && onSave(cow, result, examinedOn)}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/**
 * Recording that she calved, and nothing else.
 *
 * The calf gets added in the Calves section afterwards. Asking for gender and
 * calf details while standing next to a fresh calving is how the entry gets put
 * off and then forgotten.
 */
export const QuickCalvingSheet: React.FC<{
  cow: CowSummary | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (cow: CowSummary, calvedOn: string) => void;
}> = ({ cow, busy, onClose, onSave }) => {
  const [calvedOn, setCalvedOn] = useState(todayISO());

  useEffect(() => {
    if (cow) setCalvedOn(cow.deliveredDate ?? todayISO());
  }, [cow]);

  if (!cow) return null;

  return (
    <Sheet open={!!cow} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Cow #{cow.cowNumber} — calving</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Expected {formatDMY(cow.expectedDeliveryDate)}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-6">
          <div>
            <Label htmlFor="calved-on">Date she calved</Label>
            <Input
              id="calved-on"
              type="date"
              className="h-12 text-base"
              value={calvedOn}
              max={todayISO()}
              onChange={(e) => setCalvedOn(e.target.value)}
            />
          </div>

          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Add the calf in the Calves section when you have a moment — this just
            closes her breeding cycle so she can be served again.
          </p>

          <Button
            className="h-14 w-full text-base"
            disabled={!calvedOn || busy}
            onClick={() => onSave(cow, calvedOn)}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
