
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { canServeAgain, latestRecord, expectedDeliveryDate, DEFAULT_GESTATION_DAYS } from '@/lib/aiCycle';

interface AIRecord {
  id: string;
  cow_id?: string;
  service_number: number;
  ai_date: string;
  ai_status?: 'pending' | 'done' | 'failed';
  semen_batch?: string;
  technician_name?: string;
  pd_date?: string;
  pd_done?: boolean;
  pd_result?: 'positive' | 'negative' | 'inconclusive';
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  is_successful?: boolean;
  notes?: string;
}

export const useAITracking = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiRecords, isLoading } = useQuery({
    queryKey: ['ai-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_records')
        // Everything the dashboard reads off the cow. It previously asked only
        // for cow_number, so cows.id came back undefined -- which silently
        // broke every action keyed on it, and made the milking-move flags
        // permanently false.
        .select(`
          *,
          cows!ai_records_cow_id_fkey (
            id, cow_number, status,
            needs_milking_move, needs_milking_move_at,
            moved_to_milking, moved_to_milking_at
          )
        `)
        .order('ai_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const canAddAIRecord = async (cowId: string) => {
    const { data, error } = await supabase
      .from('ai_records')
      .select(`
        id, pd_done, pd_result, ai_date, ai_status, service_number,
        actual_delivery_date, created_at,
        cows!ai_records_cow_id_fkey (cow_number)
      `)
      // Ordering is settled in latestRecord() so a same-day pair resolves to
      // the row written last rather than to whatever came back first.
      .eq('cow_id', cowId);

    if (error) throw error;

    const last = latestRecord((data ?? []) as any[]);
    const decision = canServeAgain(last as any);

    if (decision.allowed) {
      return { canAdd: true, message: '', reason: decision.reason, recordId: null, recordData: null };
    }

    const cowNumber = (last as any)?.cows?.cow_number || 'Unknown';
    const formattedDate = last ? new Date(last.ai_date).toLocaleDateString('en-IN') : '';
    const detail = `Cow ${cowNumber} · served ${formattedDate} · service #${last?.service_number ?? '?'}`;

    const message =
      decision.reason === 'awaiting_pd'
        ? `Record the PD result first.\n\n${detail}`
        : `She is carrying a calf from that service.\n\n${detail}\n\nRecord the calving, or a negative PD, before serving again.`;

    return {
      canAdd: false,
      message,
      reason: decision.reason,
      recordId: last?.id ?? null,
      recordData: last
        ? {
            id: last.id,
            cow_number: cowNumber,
            ai_date: last.ai_date,
            service_number: last.service_number,
          }
        : null,
    };
  };

  const getNextServiceNumber = async (cowId: string) => {
    const { data, error } = await supabase
      .from('ai_records')
      .select('service_number, actual_delivery_date')
      .eq('cow_id', cowId)
      .order('ai_date', { ascending: false });
    
    if (error) throw error;
    
    // If no records exist, start with service number 1
    if (!data || data.length === 0) {
      return 1;
    }
    
    // Find the most recent successful delivery
    const lastDelivery = data.find(record => record.actual_delivery_date);
    
    if (lastDelivery) {
      // If there was a delivery, get records after that delivery date
      const { data: recordsAfterDelivery, error: deliveryError } = await supabase
        .from('ai_records')
        .select('service_number')
        .eq('cow_id', cowId)
        .gt('ai_date', lastDelivery.actual_delivery_date)
        .order('service_number', { ascending: false })
        .limit(1);
      
      if (deliveryError) throw deliveryError;
      
      // If no records after delivery, start fresh with 1
      if (!recordsAfterDelivery || recordsAfterDelivery.length === 0) {
        return 1;
      }
      
      // Otherwise increment from the highest service number after delivery
      return recordsAfterDelivery[0].service_number + 1;
    }
    
    // No delivery found, increment from the highest service number
    const maxServiceNumber = Math.max(...data.map(record => record.service_number));
    return maxServiceNumber + 1;
  };

  const addAIRecordMutation = useMutation({
    mutationFn: async (newRecord: Omit<AIRecord, 'id'>) => {
      // Validate if AI record can be added
      if (newRecord.cow_id) {
        const validation = await canAddAIRecord(newRecord.cow_id);
        if (!validation.canAdd) {
          throw new Error(validation.message);
        }
      }

      // Gestation comes from settings, defaulting to the 285 days every stored
      // record was built with. It used to be hardcoded here while the alerts
      // read the setting, so a record's own date and its reminder disagreed.
      const { data: setting } = await supabase
        .from('app_settings').select('value').eq('key', 'delivery_expected_days').maybeSingle();
      const gestation = Number((setting as any)?.value) || DEFAULT_GESTATION_DAYS;

      const { data, error } = await supabase
        .from('ai_records')
        .insert({
          ...newRecord,
          expected_delivery_date: expectedDeliveryDate(newRecord.ai_date, gestation)
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-records'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "AI record added successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Cannot add AI record", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateAIRecordMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AIRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('ai_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-records'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "AI record updated successfully!" });
    }
  });

  const deleteAIRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-records'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "AI record deleted successfully!" });
    }
  });
  
  return {
    aiRecords,
    isLoading,
    addAIRecordMutation,
    updateAIRecordMutation,
    deleteAIRecordMutation,
    getNextServiceNumber,
    canAddAIRecord
  };
};
