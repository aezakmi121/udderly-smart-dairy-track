import React from 'react';
import { Sun, Moon, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FarmerCollection, SessionGroup } from '@/lib/farmerDays';
import { isRejected } from '@/lib/farmerDays';
import {
  SESSION_HINDI,
  formatClockTime,
  formatLitres,
  formatPercent,
  formatRupees,
  speciesHindi,
} from '@/lib/farmerFormat';

const SESSION_STYLE = {
  morning: {
    icon: Sun,
    chip: 'bg-amber-100 text-amber-800',
    rail: 'bg-amber-400',
  },
  evening: {
    icon: Moon,
    chip: 'bg-indigo-100 text-indigo-800',
    rail: 'bg-indigo-400',
  },
} as const;

/** One delivery, read top to bottom: how much, what it earned, why. */
const Delivery: React.FC<{ entry: FarmerCollection }> = ({ entry }) => {
  const species = speciesHindi(entry.species);
  const time = formatClockTime(entry.created_at);

  if (isRejected(entry)) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex items-center gap-2 font-semibold text-destructive">
          <Ban className="h-4 w-4 shrink-0" />
          दूध नहीं लिया गया
        </div>
        <div className="mt-1 text-sm text-muted-foreground line-through">
          {formatLitres(entry.quantity)} लीटर
        </div>
        {entry.remarks && (
          <div className="mt-1 text-sm text-foreground/80">वजह: {entry.remarks}</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xl font-semibold tabular-nums">
          {formatLitres(entry.quantity)} <span className="text-base font-normal">लीटर</span>
        </div>
        <div className="text-2xl font-bold tabular-nums text-primary">
          {formatRupees(entry.total_amount)}
        </div>
      </div>

      {/* The three numbers farmers repeat to each other, kept quiet and on one
          line so they never compete with the amount. */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
        <span>फैट {formatPercent(entry.fat_percentage)}</span>
        <span>SNF {formatPercent(entry.snf_percentage)}</span>
        <span>भाव {formatRupees(entry.rate_per_liter)}/लीटर</span>
      </div>

      {(species || time) && (
        <div className="mt-1 text-xs text-muted-foreground">
          {[species, time].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
};

interface SessionCardProps {
  group: SessionGroup;
  /** Changes what an empty session means: not weighed yet, or never brought. */
  dayIsToday?: boolean;
  className?: string;
}

/**
 * One session of one day.
 *
 * Never a table row. A farmer holding a paper slip should be able to lay it
 * next to this card and match it line for line — which is also why the money
 * here keeps its paise.
 */
export const SessionCard: React.FC<SessionCardProps> = ({ group, dayIsToday, className }) => {
  const style = SESSION_STYLE[group.session] ?? SESSION_STYLE.morning;
  const Icon = style.icon;
  const label = SESSION_HINDI[group.session] ?? SESSION_HINDI.morning;
  const multiple = group.entries.length > 1;

  return (
    <section
      className={cn('overflow-hidden rounded-2xl border bg-card shadow-sm', className)}
      aria-label={label}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', style.chip)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold">{label}</span>
        {/* Only worth a total when there is more than one bucket to add up. */}
        {multiple && (
          <span className="ml-auto text-base font-bold tabular-nums text-primary">
            {formatRupees(group.amount)}
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        {group.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {dayIsToday ? `${label} की तौल अभी बाकी है` : `${label} को दूध नहीं दिया`}
          </p>
        ) : (
          group.entries.map((entry, i) => <Delivery key={entry.id ?? i} entry={entry} />)
        )}
      </div>
    </section>
  );
};
