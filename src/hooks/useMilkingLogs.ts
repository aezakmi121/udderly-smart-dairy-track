import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fromZonedTime } from 'date-fns-tz';

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

  const unlockLog = async (date: string, s: MilkingSession) => {
    const { data: existing, error: fetchError } = await supabase
      .from('milking_logs')
      .select('*')
      .eq('production_date', date)
      .eq('session', s)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (!existing) {
      const { error: insertError } = await supabase.from('milking_logs').insert({
        production_date: date,
        session: s,
        milking_start_time: null,
        milking_end_time: null,
      });
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await supabase
        .from('milking_logs')
        .update({ milking_end_time: null })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    }

    invalidate();
  };

  // Set start/end times explicitly
  const setStartAt = async (date: string, s: MilkingSession, iso: string) => {
    const { data: existing, error: fetchError } = await supabase
      .from('milking_logs')
      .select('*')
      .eq('production_date', date)
      .eq('session', s)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (!existing) {
      const { error: insertError } = await supabase.from('milking_logs').insert({
        production_date: date,
        session: s,
        milking_start_time: iso,
      });
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await supabase
        .from('milking_logs')
        .update({ milking_start_time: iso })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    }
    invalidate();
  };

  const setEndAt = async (date: string, s: MilkingSession, iso: string) => {
    const { data: existing, error: fetchError } = await supabase
      .from('milking_logs')
      .select('*')
      .eq('production_date', date)
      .eq('session', s)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (existing) {
      const { error: updateError } = await supabase
        .from('milking_logs')
        .update({ milking_end_time: iso })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from('milking_logs').insert({
        production_date: date,
        session: s,
        milking_start_time: null,
        milking_end_time: iso,
      });
      if (insertError) throw insertError;
    }
    invalidate();
  };

  // Helpers to set by HH:mm in a given timezone
  const setStartTime = async (date: string, s: MilkingSession, timeHHmm: string, timeZone: string) => {
    const iso = fromZonedTime(`${date}T${timeHHmm}:00`, timeZone).toISOString();
    await setStartAt(date, s, iso);
  };

  const setEndTime = async (date: string, s: MilkingSession, timeHHmm: string, timeZone: string) => {
    const iso = fromZonedTime(`${date}T${timeHHmm}:00`, timeZone).toISOString();
    await setEndAt(date, s, iso);
  };

  return { log, isLoading, startLog, endLog, unlockLog, setStartAt, setEndAt, setStartTime, setEndTime };
};
