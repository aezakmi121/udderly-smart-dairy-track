import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Baby, Syringe, AlertTriangle } from 'lucide-react';
import { formatDMY, daysSince, sincePhrase } from '@/lib/breedingDisplay';
import { cycleState } from '@/lib/aiCycle';
import { PLAUSIBLE_GESTATION_MIN, PLAUSIBLE_GESTATION_MAX } from '@/lib/breedingSettings';

interface TimelineRecord {
  id: string;
  ai_date: string;
  service_number?: number | null;
  pd_done?: boolean | null;
  pd_result?: string | null;
  pd_date?: string | null;
  actual_delivery_date?: string | null;
  notes?: string | null;
}

/**
 * One cow's whole breeding history, in one place.
 *
 * Previously this only existed as rows scattered through the All Records table,
 * so answering "what has happened to this cow" meant scanning and sorting by
 * eye. Reached by tapping any cow on the board.
 */
export const CowTimelineSheet: React.FC<{
  cowNumber?: string | null;
  records: TimelineRecord[];
  open: boolean;
  onClose: () => void;
}> = ({ cowNumber, records, open, onClose }) => {
  const ordered = [...records].sort((a, b) => (a.ai_date < b.ai_date ? 1 : -1));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Cow #{cowNumber ?? '—'}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {ordered.length} service{ordered.length === 1 ? '' : 's'} on record
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-3 pb-6">
          {ordered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          )}

          {ordered.map((r) => {
            const state = cycleState(r as any);
            const gestation = r.actual_delivery_date
              ? daysSince(r.ai_date, new Date(`${r.actual_delivery_date}T00:00:00`))
              : null;
            const impossible =
              gestation !== null &&
              (gestation < PLAUSIBLE_GESTATION_MIN || gestation > PLAUSIBLE_GESTATION_MAX);

            return (
              <div key={r.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Syringe className="h-4 w-4 text-muted-foreground" />
                      Service #{r.service_number ?? '?'}
                    </div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      {formatDMY(r.ai_date)} · {sincePhrase(daysSince(r.ai_date))}
                    </div>
                  </div>

                  {state === 'delivered' ? (
                    <Badge className="shrink-0 bg-green-100 text-green-700">Calved</Badge>
                  ) : state === 'pregnant' ? (
                    <Badge variant="secondary" className="shrink-0">Pregnant</Badge>
                  ) : state === 'open' ? (
                    <Badge variant="outline" className="shrink-0">Empty</Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-amber-700">Awaiting PD</Badge>
                  )}
                </div>

                <div className="mt-2 space-y-1 text-sm">
                  {r.pd_done && (
                    <div className="text-muted-foreground">
                      PD {r.pd_result ?? 'recorded'}
                      {r.pd_date ? ` on ${formatDMY(r.pd_date)}` : ''}
                    </div>
                  )}

                  {r.actual_delivery_date && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Baby className="h-3.5 w-3.5" />
                      Calved {formatDMY(r.actual_delivery_date)}
                      {gestation !== null && ` · ${gestation} days`}
                    </div>
                  )}

                  {impossible && (
                    <div className="flex items-start gap-1 text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {gestation} days from service to calving is not possible — the calving is on
                      the wrong record, or a date is wrong.
                    </div>
                  )}

                  {r.notes && <div className="text-muted-foreground">{r.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
