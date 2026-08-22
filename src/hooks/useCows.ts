import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GONE_STATUS_FILTER } from '@/lib/cowPresence';

interface Cow {
  id: string;
  cow_number: string;
  status: string;
}

const sortCows = (data: Cow[]) => {
  return data.sort((a, b) => {
    const numA = parseFloat(a.cow_number);
    const numB = parseFloat(b.cow_number);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    return a.cow_number.localeCompare(b.cow_number);
  });
};

/**
 * Every cow still on the farm.
 *
 * There were five of these hooks, each naming a different subset of statuses
 * for what was supposedly the same herd: vaccination excluded `pregnant`,
 * milking excluded `dry`, choosing a calf's mother demanded exactly `active`.
 * None of it had ever taken effect -- no cow has ever been anything but
 * `active` or `sold` -- so the first time anyone set `dry` a cow would have
 * disappeared from three screens, stayed on two, and nobody would have known
 * which was which.
 *
 * One query now, excluding the two statuses that mean she has left. The named
 * exports are kept so callers read as what they are for.
 */
const useCowsOnFarm = (queryKey: string) =>
  useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, status')
        .not('status', 'in', GONE_STATUS_FILTER);

      if (error) throw error;
      return sortCows(data as Cow[]);
    },
  });

/** Cows on the farm. Everything below is this, under a name that says why. */
export const useActiveCows = () => {
  const { data: cows } = useCowsOnFarm('cows-on-farm');
  return { cows };
};

/** For AI tracking. */
export const useAICows = useActiveCows;

/** For vaccination. A dry or pregnant cow is still vaccinated. */
export const useVaccinationCows = useActiveCows;

/** For weight logs. */
export const useWeightLogCows = useActiveCows;

/** For group assignments. */
export const useGroupAssignmentCows = useActiveCows;

/**
 * For milk production entry.
 *
 * This one used to exclude `dry`, which is the only one of the five exclusions
 * that was arguably right -- a dry cow is not milked. It is folded in with the
 * rest because nothing sets `dry`: a cow on this farm is active whatever her
 * condition. If dry-off is ever tracked, this is the hook to split back out,
 * and it should read from the breeding board's dry-off window rather than from
 * a status somebody has to remember to set.
 */
export const useMilkingCows = useActiveCows;

// Backward compatibility - use cows on the farm as default
export const useCows = useActiveCows;
