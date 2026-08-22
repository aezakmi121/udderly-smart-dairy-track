import { useMemo } from 'react';
import { useHerdActionGroups } from '@/hooks/useHerdActionGroups';

export interface CowActionSummary {
  pdDue: number;
  closeToDelivery: number;
  overdueDelivery: number;
  needsAI: number;
}

/**
 * The four dashboard counts, taken from the same grouping the breeding board
 * renders.
 *
 * This previously ran its own queries and disagreed with the board on every
 * tile: PD due was hardcoded at 60 days against the board's configurable
 * 35/60, close-to-delivery looked 60 days ahead against the board's three
 * weeks, and counts were of records rather than cows — so a cow with two
 * unchecked services was counted twice. "Needs AI" was worse than
 * inconsistent: it filtered `cows` on an `is_active` column that does not
 * exist (the column is `status`), the error was swallowed by allSettled, and
 * the tile had always read zero.
 */
export const useCowActionSummary = () => {
  const { grouped, count, isLoading, error } = useHerdActionGroups();

  const data = useMemo<CowActionSummary | undefined>(() => {
    if (!grouped) return undefined;
    return {
      pdDue: count('pd_due') + count('pd_overdue'),
      closeToDelivery: count('due_to_calve'),
      overdueDelivery: count('overdue_delivery'),
      needsAI: count('not_pregnant') + count('ready_to_serve'),
    };
    // `count` reads from `grouped`, which is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped]);

  return { data, isLoading, error };
};
