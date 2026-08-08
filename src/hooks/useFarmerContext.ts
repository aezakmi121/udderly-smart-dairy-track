import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { summariseHabit, type CollectionLike } from '@/lib/collectionGuards';

/**
 * What this farmer has been bringing lately, and what is already recorded for
 * them in the session being entered.
 *
 * Both exist for the same reason: a wrong member code produces an entry that is
 * perfectly valid in isolation. It only looks wrong next to the farmer it was
 * charged to.
 */
export const useFarmerContext = (
  farmerId: string | null | undefined,
  collectionDate: string,
  session: string
) =>
  useQuery({
    queryKey: ['farmer-context', farmerId, collectionDate, session],
    enabled: !!farmerId,
    // Cheap and read-only, but the operator is typing: don't refetch under them.
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: recent, error: recentError }, { data: sameSession, error: sessionError }] =
        await Promise.all([
          supabase
            .from('milk_collections')
            .select('id, collection_date, session, quantity, fat_percentage, snf_percentage, species, created_at')
            .eq('farmer_id', farmerId!)
            .eq('is_accepted', true)
            .lt('collection_date', collectionDate)
            .order('collection_date', { ascending: false })
            .limit(20),
          supabase
            .from('milk_collections')
            .select('id, collection_date, session, quantity, fat_percentage, snf_percentage, species, created_at')
            .eq('farmer_id', farmerId!)
            .eq('collection_date', collectionDate)
            .eq('session', session as never),
        ]);

      if (recentError) throw recentError;
      if (sessionError) throw sessionError;

      const history = (recent ?? []) as unknown as CollectionLike[];
      return {
        history,
        habit: summariseHabit(history),
        lastDelivery: history[0] ?? null,
        sameSession: (sameSession ?? []) as unknown as CollectionLike[],
      };
    },
  });
