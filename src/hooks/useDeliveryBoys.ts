
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeliveryBoy {
  id: string;
  user_id?: string;
  name: string;
  phone_number: string;
  vehicle_type?: string;
  vehicle_number?: string;
  assigned_area?: string;
  daily_capacity: number;
  is_active: boolean;
  created_at: string;
}

interface DeliveryBoyInsert {
  user_id?: string;
  name: string;
  phone_number: string;
  vehicle_type?: string;
  vehicle_number?: string;
  assigned_area?: string;
  daily_capacity?: number;
  is_active?: boolean;
}

export const useDeliveryBoys = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliveryBoys, isLoading } = useQuery({
    queryKey: ['delivery-boys'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('delivery_boys')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching delivery boys:', error);
          return [];
        }
        return data as DeliveryBoy[];
      } catch (error) {
        console.error('Failed to fetch delivery boys:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const deliveryBoyMutation = useMutation({
    mutationFn: async ({ deliveryBoyData, isUpdate, id }: { 
      deliveryBoyData: Partial<DeliveryBoyInsert>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      if (isUpdate && id) {
        const { error } = await supabase
          .from('delivery_boys')
          .update(deliveryBoyData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_boys')
          .insert(deliveryBoyData as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-boys'] });
      toast({ title: `Delivery boy ${isUpdate ? 'updated' : 'added'} successfully!` });
    },
    onError: (error: any, { isUpdate }) => {
      console.error('Delivery boy mutation error:', error);
      toast({ 
        title: `Failed to ${isUpdate ? 'update' : 'add'} delivery boy`, 
        description: error.message || 'Please check your permissions',
        variant: "destructive" 
      });
    }
  });

  return {
    deliveryBoys: deliveryBoys || [],
    isLoading,
    deliveryBoyMutation
  };
};
