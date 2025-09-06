
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WeightLog {
  id: string;
  cow_id?: string;
  heart_girth: number;
  body_length: number;
  calculated_weight: number;
  log_date: string;
  notes?: string;
}

export const useWeightLogs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: weightLogs, isLoading, error } = useQuery({
    queryKey: ['weight-logs'],
    queryFn: async () => {
      
      const { data, error } = await supabase
        .from('weight_logs')
        .select(`
          *,
          cows!weight_logs_cow_id_fkey (cow_number)
        `)
        .order('log_date', { ascending: false });
      
      if (error) {
        
        throw error;
      }
      
      return data;
    }
  });

  const addWeightLogMutation = useMutation({
    mutationFn: async (newLog: Omit<WeightLog, 'id' | 'calculated_weight'> & { calculated_weight?: number }) => {
      // Calculate weight using heart girth and body length (Schaeffer's formula)
      const calculatedWeight = newLog.calculated_weight || 
        ((newLog.heart_girth * newLog.heart_girth * newLog.body_length) / 300);

      const { data, error } = await supabase
        .from('weight_logs')
        .insert({ ...newLog, calculated_weight: calculatedWeight })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      toast({ title: "Weight log added successfully!" });
    },
    onError: (error) => {
      
      toast({ 
        title: "Failed to add weight log", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    weightLogs,
    isLoading,
    addWeightLogMutation
  };
};
