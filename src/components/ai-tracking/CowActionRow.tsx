import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Flag, CheckCircle, Undo, AlertTriangle } from 'lucide-react';
import type { CowSummary } from '@/lib/pdUtils';
import type { ActionGroup } from '@/lib/breedingActions';
import { formatDMY, daysSince, daysUntil, untilPhrase, sincePhrase } from '@/lib/breedingDisplay';

interface CowActionRowProps {
  cow: CowSummary;
  group: ActionGroup | null;
  busy?: boolean;
  onRecordPd: (cow: CowSummary) => void;
  onRecordCalving: (cow: CowSummary) => void;
  onFlagForMove: (cowId: string) => void;
  onUndoFlag: (cowId: string) => void;
  onMarkMoved: (cowId: string) => void;
  onOpenTimeline: (cow: CowSummary) => void;
}

/**
 * One cow, one line, and the button for whatever she is listed under.
 *
 * The board used to tell you what needed doing and then send you to another
 * screen to do it -- a cow under "PD due" had no PD button. Read one-handed on
 * a phone in a shed, so the number is large, the single relevant fact sits
 * beside it, and the action is a full-width target rather than an icon.
 */
export const CowActionRow: React.FC<CowActionRowProps> = ({
  cow,
  group,
  busy,
  onRecordPd,
  onRecordCalving,
  onFlagForMove,
  onUndoFlag,
  onMarkMoved,
  onOpenTimeline,
}) => {
  const sinceService = daysSince(cow.latestAIDate);
  const untilCalving = daysUntil(cow.expectedDeliveryDate);

  // The one fact worth reading for the reason she is on screen.
  const headline = (() => {
    switch (group) {
      case 'pd_due':
      case 'pd_overdue':
      case 'heat_watch':
        return `served ${sincePhrase(sinceService)}`;
      case 'due_to_calve':
      case 'move_to_milking':
      case 'overdue_delivery':
        return `calving ${untilPhrase(untilCalving)}`;
      case 'check_record':
        return cow.deliveredDate && cow.latestAIDate
          ? `${daysSince(cow.latestAIDate, new Date(`${cow.deliveredDate}T00:00:00`))} days to calving`
          : 'dates do not add up';
      default:
        return cow.status;
    }
  })();

  const detail = (() => {
    switch (group) {
      case 'pd_due':
      case 'pd_overdue':
      case 'heat_watch':
        return `service #${cow.serviceNumber} · ${formatDMY(cow.latestAIDate)}`;
      case 'due_to_calve':
      case 'move_to_milking':
      case 'overdue_delivery':
        return `expected ${formatDMY(cow.expectedDeliveryDate)}`;
      case 'check_record':
        return `served ${formatDMY(cow.latestAIDate)} → calved ${formatDMY(cow.deliveredDate)}`;
      default:
        return `service #${cow.serviceNumber} · ${formatDMY(cow.latestAIDate)}`;
    }
  })();

  const urgent =
    group === 'overdue_delivery' || group === 'pd_overdue' || group === 'check_record';

  return (
    <div
      className={`rounded-xl border bg-card p-3 ${urgent ? 'border-destructive/50' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOpenTimeline(cow)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="text-2xl font-bold tabular-nums">#{cow.cowNumber}</span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-medium ${urgent ? 'text-destructive' : ''}`}>
            {headline}
          </span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        {cow.movedToMilking && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">moved</Badge>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      {group === 'check_record' && (
        <p className="mt-2 flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The calving is on the wrong record, or a date is wrong.
        </p>
      )}

      {/* Big targets: this is used standing up, one-handed, in a shed. */}
      <div className="mt-2 flex gap-2">
        {(group === 'pd_due' || group === 'pd_overdue' || group === 'heat_watch') && (
          <Button className="h-12 flex-1 text-base" onClick={() => onRecordPd(cow)} disabled={busy}>
            Record PD
          </Button>
        )}

        {(group === 'due_to_calve' || group === 'overdue_delivery') && (
          <Button className="h-12 flex-1 text-base" onClick={() => onRecordCalving(cow)} disabled={busy}>
            Record calving
          </Button>
        )}

        {group === 'move_to_milking' && (
          <>
            <Button
              className="h-12 flex-1 text-base"
              onClick={() => onMarkMoved(cow.cowId)}
              disabled={busy}
            >
              <CheckCircle className="mr-1 h-4 w-4" /> Moved
            </Button>
            {cow.needsMilkingMove ? (
              <Button
                variant="outline"
                className="h-12 px-4"
                onClick={() => onUndoFlag(cow.cowId)}
                disabled={busy}
                aria-label="Undo flag"
              >
                <Undo className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-12 px-4"
                onClick={() => onFlagForMove(cow.cowId)}
                disabled={busy}
                aria-label="Flag for move"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        {group === 'check_record' && (
          <Button
            variant="outline"
            className="h-12 flex-1 text-base"
            onClick={() => onOpenTimeline(cow)}
          >
            Open record
          </Button>
        )}
      </div>
    </div>
  );
};
