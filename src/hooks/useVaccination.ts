
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VaccinationSchedule {
  id: string;
  vaccine_name: string;
  description?: string;
  frequency_months: number;
  is_active?: boolean;
}

interface VaccinationRecord {
  id: string;
  cow_id?: string;
  vaccination_schedule_id?: string;
  vaccination_date: string;
  next_due_date: string;
  batch_number?: string;
  administered_by?: string;
  notes?: string;
}

export const useVaccination = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedules } = useQuery({
    queryKey: ['vaccination-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vaccination_schedules')
        .select('*')
        .eq('is_active', true)
        .order('vaccine_name');
      
      if (error) throw error;
      return data as VaccinationSchedule[];
    }
  });

  const { data: records, isLoading, error } = useQuery({
    queryKey: ['vaccination-records'],
    queryFn: async () => {
      console.log('Fetching vaccination records...');
      const { data, error } = await supabase
        .from('vaccination_records')
        .select(`
          *,
          cows!cow_id (cow_number),
          vaccination_schedules!vaccination_schedule_id (vaccine_name)
        `)
        .order('vaccination_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching vaccination records:', error);
        throw error;
      }
      console.log('Vaccination records fetched:', data);
      return data;
    }
  });

  const addRecordMutation = useMutation({
    mutationFn: async (newRecord: Omit<VaccinationRecord, 'id'>) => {
      const { data, error } = await supabase
        .from('vaccination_records')
        .insert(newRecord)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('Vaccination record added successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['vaccination-records'] });
      toast({ title: "Vaccination record added successfully!" });
    },
    onError: (error) => {
      console.error('Error adding vaccination record:', error);
      toast({ 
        title: "Failed to add vaccination record", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    schedules,
    records,
    isLoading,
    addRecordMutation
  };
};
