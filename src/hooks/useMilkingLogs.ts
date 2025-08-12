import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MilkingSession = 'morning' | 'evening';

export interface MilkingLog {
  id: string;
  production_date: string; // date
  session: MilkingSession;
  milking_start_time: string | null; // timestamptz
  milking_end_time: string | null; // timestamptz
  created_at?: string | null;
  updated_at?: string | null;
}

export const useMilkingLog = (productionDate: string, session: MilkingSession) => {
  const queryClient = useQueryClient();

  const { data: log, isLoading } = useQuery<MilkingLog | null>({
    queryKey: ['milking-log', productionDate, session],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milking_logs')
        .select('*')
        .eq('production_date', productionDate)
        .eq('session', session)
        .maybeSingle();
      if (error) throw error;
      return (data as MilkingLog) ?? null;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['milking-log', productionDate, session] });
  };

  const startLog = async (date: string, s: MilkingSession) => {
    // Ensure a log exists with start time set; do not overwrite if already set
    const { data: existing, error: fetchError } = await supabase
      .from('milking_logs')
      .select('*')
      .eq('production_date', date)
      .eq('session', s)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const nowIso = new Date().toISOString();

    if (!existing) {
      const { error: insertError } = await supabase.from('milking_logs').insert({
        production_date: date,
        session: s,
        milking_start_time: nowIso,
      });
      if (insertError) throw insertError;
    } else if (!existing.milking_start_time) {
      const { error: updateError } = await supabase
        .from('milking_logs')
        .update({ milking_start_time: nowIso })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    }

    invalidate();
  };

  const endLog = async (date: string, s: MilkingSession) => {
    const { data: existing, error: fetchError } = await supabase
      .from('milking_logs')
      .select('*')
      .eq('production_date', date)
      .eq('session', s)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const nowIso = new Date().toISOString();

    if (existing && !existing.milking_end_time) {
      const { error: updateError } = await supabase
        .from('milking_logs')
        .update({ milking_end_time: nowIso })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    }

    invalidate();
  };

  return { log, isLoading, startLog, endLog };
};
