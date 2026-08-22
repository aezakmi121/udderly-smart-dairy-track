import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Flag, CheckCircle, Undo, AlertTriangle } from 'lucide-react';
import type { CowSummary } from '@/lib/pdUtils';
import type { CowCycle } from '@/lib/cowCycle';
import { BADGE_LABEL, type ActionGroup, type CowBadge } from '@/lib/breedingActions';
import { formatDMY, daysSince, daysUntil, untilPhrase, sincePhrase } from '@/lib/breedingDisplay';

interface CowActionRowProps {
  cow: CowSummary;
  group: ActionGroup | null;
  /** Null when the row is a mis-entered record rather than a stage. */
  oddRecord?: boolean;
  cycle?: CowCycle;
  badges?: CowBadge[];
  busy?: boolean;
  onRecordPd: (cow: CowSummary) => void;
  onRecordCalving: (cow: CowSummary) => void;
  onFlagForMove: (cowId: string) => void;
  onUndoFlag: (cowId: string) => void;
  onMarkMoved: (cowId: string) => void;
  onOpenTimeline: (cow: CowSummary) => void;
}

/** The reason she is on screen, and the date behind it. */
const describe = (
  group: ActionGroup | null,
  oddRecord: boolean,
  cow: CowSummary,
  cycle: CowCycle | undefined
): { headline: string; detail: string } => {
  const sinceService = daysSince(cow.latestAIDate);
  const untilCalving = daysUntil(cow.expectedDeliveryDate);
  const sinceCalving = cycle?.daysInMilk ?? daysSince(cow.deliveredDate);
  const lastCalved = cycle?.lastCalvingDate ?? cow.deliveredDate;
  const services = cycle?.servicesThisLactation ?? cow.serviceNumber;
  // Every farmer asks the same follow-up about an empty cow, so it is the
  // second line rather than something to go and look up.
  const openLine = cycle?.daysOpen != null ? `${cycle.daysOpen} days open` : null;
  const servicesLine = `${services} service${services === 1 ? '' : 's'} this lactation`;

  if (oddRecord) {
    return {
      headline:
        cow.deliveredDate && cow.latestAIDate
          ? `${daysSince(cow.latestAIDate, new Date(`${cow.deliveredDate}T00:00:00`))} days to calving`
          : 'dates do not add up',
      detail: `served ${formatDMY(cow.latestAIDate)} → calved ${formatDMY(cow.deliveredDate)}`,
    };
  }

  switch (group) {
    case 'pd_due':
    case 'pd_overdue':
    case 'heat_watch':
    case 'served_waiting':
      return {
        headline: `served ${sincePhrase(sinceService)}`,
        detail: `service #${cow.serviceNumber} · ${formatDMY(cow.latestAIDate)}`,
      };

    case 'due_to_calve':
    case 'move_to_milking':
    case 'overdue_delivery':
    case 'pregnant_on_track':
      return {
        headline: `calving ${untilPhrase(untilCalving)}`,
        detail: `expected ${formatDMY(cow.expectedDeliveryDate)}`,
      };

    // Empty. The service date is the wrong fact here -- what matters is how
    // long she has been open and how many straws it has already cost.
    case 'not_pregnant':
      return {
        headline: openLine ?? `checked ${sincePhrase(daysSince(cow.pdDate))}`,
        detail: [
          cow.pdDate ? `PD ${formatDMY(cow.pdDate)}` : 'no PD date',
          servicesLine,
        ].join(' · '),
      };

    // Calving-derived: she is here because of when she calved, so that is the
    // date shown. Showing a service date here was the original complaint.
    case 'ready_to_serve':
      return {
        headline: openLine ?? `calved ${sincePhrase(sinceCalving)}`,
        detail: lastCalved
          ? `calved ${formatDMY(lastCalved)} · ${servicesLine}`
          : 'no calving on record',
      };

    case 'recently_calved':
      return {
        headline: `calved ${sincePhrase(sinceCalving)}`,
        detail: lastCalved ? `calved ${formatDMY(lastCalved)}` : 'no calving on record',
      };

    default:
      return {
        headline: cow.status,
        detail: `service #${cow.serviceNumber} · ${formatDMY(cow.latestAIDate)}`,
      };
  }
};

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
  oddRecord = false,
  cycle,
  badges = [],
  busy,
  onRecordPd,
  onRecordCalving,
  onFlagForMove,
  onUndoFlag,
  onMarkMoved,
  onOpenTimeline,
}) => {
  const { headline, detail } = describe(group, oddRecord, cow, cycle);
  const urgent = oddRecord || group === 'overdue_delivery' || group === 'pd_overdue';
  const needsPd = group === 'pd_due' || group === 'pd_overdue' || group === 'heat_watch';
  const needsCalving = group === 'due_to_calve' || group === 'overdue_delivery';
  const needsService = group === 'not_pregnant' || group === 'ready_to_serve';
  const needsMove = group === 'move_to_milking' || badges.includes('needs_move');

  return (
    <div className={`rounded-xl border bg-card p-3 ${urgent ? 'border-destructive/50' : ''}`}>
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

      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {badges.map((b) => (
            <Badge
              key={b}
              variant="outline"
              className={
                b === 'repeat_breeder' || b === 'long_open'
                  ? 'border-amber-400 text-amber-700 text-[10px]'
                  : 'text-[10px]'
              }
            >
              {BADGE_LABEL[b]}
            </Badge>
          ))}
        </div>
      )}

      {oddRecord && (
        <p className="mt-2 flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The calving is on the wrong record, or a date is wrong.
        </p>
      )}

      {/* Big targets: this is used standing up, one-handed, in a shed. */}
      <div className="mt-2 flex gap-2">
        {needsPd && (
          <Button className="h-12 flex-1 text-base" onClick={() => onRecordPd(cow)} disabled={busy}>
            Record PD
          </Button>
        )}

        {needsCalving && (
          <Button className="h-12 flex-1 text-base" onClick={() => onRecordCalving(cow)} disabled={busy}>
            Record calving
          </Button>
        )}

        {/* Nothing to record: serving her happens at the AI form, so the row
            opens her history rather than pretending to be a shortcut. */}
        {needsService && (
          <Button
            variant="outline"
            className="h-12 flex-1 text-base"
            onClick={() => onOpenTimeline(cow)}
          >
            Open record
          </Button>
        )}

        {needsMove && (
          <>
            <Button
              className="h-12 flex-1 text-base"
              variant={group === 'move_to_milking' ? 'default' : 'outline'}
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

        {oddRecord && (
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
