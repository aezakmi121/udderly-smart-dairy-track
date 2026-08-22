import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { latestRecord, type CycleRecord } from '@/lib/aiCycle';
import { buildCowCycle, type CowCycle } from '@/lib/cowCycle';
import { groupHerd, cowBadges, type ActionGroup, type CowBadge } from '@/lib/breedingActions';
import { useAppSetting } from '@/hooks/useAppSettings';
import {
  BREEDING_SETTINGS_KEY,
  normaliseBreedingSettings,
  type BreedingSettings,
} from '@/lib/breedingSettings';

/** An AI record with the bits of the cow the board decides on. */
export interface BoardRecord extends CycleRecord {
  id: string;
  cow_id: string | null;
  expected_delivery_date: string | null;
  created_at: string | null;
  cows: {
    id: string;
    cow_number: string | null;
    status: string | null;
    moved_to_milking: boolean | null;
  } | null;
}

export interface HerdEntry {
  record: BoardRecord;
  movedToMilking: boolean;
  /** Read across her whole history, not just the record above. */
  cycle: CowCycle;
  badges: CowBadge[];
}

const SELECT =
  'id, cow_id, ai_date, ai_status, pd_done, pd_result, expected_delivery_date, actual_delivery_date, created_at, cows!ai_records_cow_id_fkey (id, cow_number, status, moved_to_milking)';

/**
 * The herd bucketed into stages — one cow, one stage, decided by her most
 * recent record but described using her whole history.
 *
 * Shared so the breeding board, the dashboard tiles, and the list behind each
 * tile all answer from the same grouping. They used to run three sets of
 * queries against different hardcoded windows and disagree with each other on
 * the same herd.
 */
export const useHerdActionGroups = (enabled = true) => {
  const { value: storedBreeding } = useAppSetting<BreedingSettings>(BREEDING_SETTINGS_KEY);
  const breeding = useMemo(() => normaliseBreedingSettings(storedBreeding), [storedBreeding]);

  const query = useQuery({
    queryKey: ['herd-action-records'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_records')
        .select(SELECT)
        .order('ai_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BoardRecord[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    if (!query.data) return undefined;

    // A cow that has left the herd has no breeding to track.
    const byCow = new Map<string, BoardRecord[]>();
    for (const r of query.data) {
      if (!r.cow_id || !r.cows) continue;
      if (r.cows.status && r.cows.status !== 'active') continue;
      const list = byCow.get(r.cow_id) ?? [];
      list.push(r);
      byCow.set(r.cow_id, list);
    }

    const herd: HerdEntry[] = Array.from(byCow.values()).flatMap((list) => {
      const record = latestRecord(list);
      if (!record) return [];
      const cycle = buildCowCycle(list, record);
      const movedToMilking = !!record.cows?.moved_to_milking;
      const entry = { record, movedToMilking, cycle };
      return [{ ...entry, badges: cowBadges(entry, breeding) }];
    });

    return groupHerd(herd, breeding);
  }, [query.data, breeding]);

  const count = (group: ActionGroup) => grouped?.stages.get(group)?.length ?? 0;

  return {
    grouped,
    count,
    settings: breeding,
    isLoading: query.isLoading,
    error: query.error,
  };
};
