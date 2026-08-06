import React, { useState } from 'react';
import { ChevronDown, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DayGroup } from '@/lib/farmerDays';
import { dayHeadline, formatLitresShort, formatRupees } from '@/lib/farmerFormat';
import { DaySessions } from './DayView';

/** How many past days are visible before the reader asks for more. */
const PAGE = 7;

/**
 * One past day, closed. Tapping opens the same two session cards used for
 * today, so there is only ever one screen layout to learn.
 */
export const DayCard: React.FC<{ day: DayGroup; now?: Date; defaultOpen?: boolean }> = ({
  day,
  now = new Date(),
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const heading = dayHeadline(day.date, now);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left active:bg-muted/60"
      >
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold tabular-nums">{heading.lead}</div>
          {heading.detail && (
            <div className="text-xs text-muted-foreground">{heading.detail}</div>
          )}
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground tabular-nums">
            <span className="flex items-center gap-1">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              {formatLitresShort(day.morning.litres)} ली
            </span>
            <span className="flex items-center gap-1">
              <Moon className="h-3.5 w-3.5 text-indigo-500" />
              {formatLitresShort(day.evening.litres)} ली
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold tabular-nums text-primary">
            {formatRupees(day.amount)}
          </div>
          {day.rejectedCount > 0 && (
            <div className="text-[11px] text-destructive">दूध वापस हुआ</div>
          )}
        </div>

        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t bg-muted/30 p-3">
          <DaySessions day={day} now={now} />
        </div>
      )}
    </div>
  );
};

interface DayListProps {
  days: DayGroup[];
  now?: Date;
  emptyMessage?: string;
}

/**
 * Older days, a week at a time.
 *
 * No date picker and no range filter: choosing a range is a literacy tax, and
 * scrolling back is something everyone can already do.
 */
export const DayList: React.FC<DayListProps> = ({
  days,
  now = new Date(),
  emptyMessage = 'इससे पहले का कोई हिसाब नहीं',
}) => {
  const [visible, setVisible] = useState(PAGE);

  if (days.length === 0) {
    return <p className="px-1 py-4 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {days.slice(0, visible).map((day) => (
        <DayCard key={day.date} day={day} now={now} />
      ))}

      {visible < days.length && (
        <Button
          variant="outline"
          className="h-12 w-full text-base"
          onClick={() => setVisible((v) => v + 30)}
        >
          और दिखाएँ
        </Button>
      )}
    </div>
  );
};
