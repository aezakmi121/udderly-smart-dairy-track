
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
        .select(`
          *,
          cows!cow_id (cow_number)
        `)
        .order('ai_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

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
      // Calculate expected delivery date (285 days after AI date)
      const aiDate = new Date(newRecord.ai_date);
      const expectedDeliveryDate = new Date(aiDate);
      expectedDeliveryDate.setDate(aiDate.getDate() + 285);

      const { data, error } = await supabase
        .from('ai_records')
        .insert({
          ...newRecord,
          expected_delivery_date: expectedDeliveryDate.toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-records'] });
      toast({ title: "AI record added successfully!" });
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
      toast({ title: "AI record updated successfully!" });
    }
  });

  return {
    aiRecords,
    isLoading,
    addAIRecordMutation,
    updateAIRecordMutation,
    getNextServiceNumber
  };
};
