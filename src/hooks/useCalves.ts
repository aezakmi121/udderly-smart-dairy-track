
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Calf {
  id: string;
  calf_number?: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  mother_cow_id?: string;
  breed?: string;
  birth_weight?: number;
  status?: 'alive' | 'dead' | 'sold';
  image_url?: string;
  notes?: string;
}

export const useCalves = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: calves, isLoading } = useQuery({
    queryKey: ['calves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calves')
        .select(`
          *,
          cows!mother_cow_id (
            cow_number
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const addCalfMutation = useMutation({
    mutationFn: async (newCalf: Omit<Calf, 'id'>) => {
      const { data, error } = await supabase
        .from('calves')
        .insert(newCalf)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      toast({ title: "Calf added successfully!" });
    }
  });

  const updateCalfMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Calf> & { id: string }) => {
      const { data, error } = await supabase
        .from('calves')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      toast({ title: "Calf updated successfully!" });
    }
  });

  const deleteCalfMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calves')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      toast({ title: "Calf deleted successfully!" });
    }
  });

  const createCalfFromDelivery = useMutation({
    mutationFn: async (data: {
      aiRecordId: string;
      deliveryDate: string;
      calfGender: 'male' | 'female';
      motherCowId: string;
      birthWeight?: number;
      calfNumber?: string;
      notes?: string;
    }) => {
      // First update the AI record
      const { error: aiError } = await supabase
        .from('ai_records')
        .update({
          actual_delivery_date: data.deliveryDate,
          calf_gender: data.calfGender,
          is_successful: true
        })
        .eq('id', data.aiRecordId);

      if (aiError) throw aiError;

      // Then create the calf record
      const { data: calfData, error: calfError } = await supabase
        .from('calves')
        .insert({
          calf_number: data.calfNumber,
          gender: data.calfGender,
          date_of_birth: data.deliveryDate,
          mother_cow_id: data.motherCowId,
          birth_weight: data.birthWeight,
          status: 'alive',
          notes: data.notes
        })
        .select()
        .single();

      if (calfError) throw calfError;

      return { aiRecord: data.aiRecordId, calf: calfData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      queryClient.invalidateQueries({ queryKey: ['ai-records'] });
      toast({ title: "Delivery recorded and calf created successfully!" });
    }
  });

  return {
    calves,
    isLoading,
    addCalfMutation,
    updateCalfMutation,
    deleteCalfMutation,
    createCalfFromDelivery
  };
};
