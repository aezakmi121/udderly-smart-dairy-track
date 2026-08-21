import { useMemo } from 'react';
import { useHerdActionGroups, type BoardRecord } from '@/hooks/useHerdActionGroups';
import type { ActionGroup } from '@/lib/breedingActions';

export type ActionCategory = 'pd-due' | 'close-delivery' | 'overdue-delivery' | 'needs-ai';

export interface ActionDetailRow {
  id: string;
  cowNumber: string;
  primaryDate?: string; // AI date / expected delivery / last delivery
  primaryLabel: string;
  daysValue: number;
  daysLabel: string;
}

/** Which board headings each tile opens out into. */
const CATEGORY_GROUPS: Record<ActionCategory, ActionGroup[]> = {
  'pd-due': ['pd_due', 'pd_overdue'],
  'close-delivery': ['due_to_calve'],
  'overdue-delivery': ['overdue_delivery'],
  'needs-ai': ['needs_service'],
};

const today = () => new Date().toISOString().split('T')[0];
const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);

/**
 * The cows behind a dashboard tile.
 *
 * Derived from the same grouping as the tile's count and as the breeding
 * board, so the number on the tile and the list behind it cannot disagree.
 * Both previously ran their own queries against hardcoded 60-day windows.
 */
export const useCowActionDetails = (category: ActionCategory | null) => {
  const { grouped, isLoading, error } = useHerdActionGroups(!!category);

  const data = useMemo<ActionDetailRow[] | undefined>(() => {
    if (!category || !grouped) return undefined;
    const t = today();

    // A cow in both PD groups is still one cow.
    const seen = new Set<string>();
    const rows: ActionDetailRow[] = [];
    for (const group of CATEGORY_GROUPS[category]) {
      for (const entry of grouped.get(group) ?? []) {
        if (seen.has(entry.record.id)) continue;
        seen.add(entry.record.id);
        rows.push(describe(category, entry.record, t));
      }
    }

    return rows.sort((a, b) => b.daysValue - a.daysValue);
  }, [category, grouped]);

  return { data, isLoading, error };
};

const describe = (category: ActionCategory, r: BoardRecord, t: string): ActionDetailRow => {
  const cowNumber = r.cows?.cow_number ?? '—';
  switch (category) {
    case 'close-delivery':
      return {
        id: r.id, cowNumber,
        primaryDate: r.expected_delivery_date ?? undefined,
        primaryLabel: 'Expected',
        daysValue: r.expected_delivery_date ? daysBetween(t, r.expected_delivery_date) : 0,
        daysLabel: 'days to go',
      };
    case 'overdue-delivery':
      return {
        id: r.id, cowNumber,
        primaryDate: r.expected_delivery_date ?? undefined,
        primaryLabel: 'Expected',
        daysValue: r.expected_delivery_date ? daysBetween(r.expected_delivery_date, t) : 0,
        daysLabel: 'days overdue',
      };
    case 'needs-ai': {
      // She is here either because she calved and the waiting period is up, or
      // because the last service did not take.
      const since = r.actual_delivery_date ?? r.ai_date;
      return {
        id: r.id, cowNumber,
        primaryDate: since ?? undefined,
        primaryLabel: r.actual_delivery_date ? 'Calved' : 'Last service',
        daysValue: since ? daysBetween(since, t) : 0,
        daysLabel: r.actual_delivery_date ? 'days since calving' : 'days since service',
      };
    }
    case 'pd-due':
    default:
      return {
        id: r.id, cowNumber,
        primaryDate: r.ai_date ?? undefined,
        primaryLabel: 'AI on',
        daysValue: r.ai_date ? daysBetween(r.ai_date, t) : 0,
        daysLabel: 'days since AI',
      };
  }
};
