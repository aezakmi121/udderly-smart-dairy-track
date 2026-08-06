import React from 'react';
import { cn } from '@/lib/utils';
import type { DayGroup } from '@/lib/farmerDays';
import { todayISO } from '@/lib/farmerDays';
import { dayHeadline, formatLitresShort, formatRupees } from '@/lib/farmerFormat';
import { SessionCard } from './SessionCard';

/** The two session cards for a day, morning first. */
export const DaySessions: React.FC<{ day: DayGroup; now?: Date; className?: string }> = ({
  day,
  now = new Date(),
  className,
}) => {
  const isToday = day.date === todayISO(now);
  return (
    <div className={cn('space-y-2', className)}>
      <SessionCard group={day.morning} dayIsToday={isToday} />
      <SessionCard group={day.evening} dayIsToday={isToday} />
    </div>
  );
};

interface DayHeroProps {
  day: DayGroup | null;
  farmerName?: string | null;
  farmerCode?: string | null;
  now?: Date;
}

/**
 * The one thing on screen when the portal opens: what today came to.
 *
 * Paise are kept here as well as on the delivery cards, because this number is
 * the two slips in the farmer's hand added together.
 */
export const DayHero: React.FC<DayHeroProps> = ({
  day,
  farmerName,
  farmerCode,
  now = new Date(),
}) => {
  const today = todayISO(now);
  const heading = dayHeadline(day?.date ?? today, now);
  // The portal falls back to the last day with milk. Say so, or a farmer
  // reading yesterday's total will think today's has gone missing.
  const showingOlderDay = !!day && day.date !== today;

  return (
    <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-md">
      {(farmerName || farmerCode) && (
        <div className="text-sm opacity-85">
          {[farmerName, farmerCode].filter(Boolean).join(' · ')}
        </div>
      )}

      <div className="mt-1 text-base font-medium">
        {heading.lead}
        {heading.detail && <span className="ml-2 text-sm opacity-80">{heading.detail}</span>}
      </div>

      {day ? (
        <>
          <div className="mt-2 text-4xl font-bold tabular-nums">{formatRupees(day.amount)}</div>
          <div className="mt-1 text-sm opacity-85 tabular-nums">
            {formatLitresShort(day.litres)} लीटर · {day.acceptedCount} बार
          </div>
          {showingOlderDay && (
            <div className="mt-2 rounded-lg bg-primary-foreground/15 px-2 py-1 text-xs">
              आज की तौल अभी दर्ज नहीं हुई
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 text-base opacity-90">आज का दूध अभी दर्ज नहीं हुआ</div>
      )}
    </div>
  );
};
