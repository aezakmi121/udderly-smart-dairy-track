
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
      const { data, error } = await (supabase as any)
        .from('delivery_boys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DeliveryBoy[];
    }
  });

  const deliveryBoyMutation = useMutation({
    mutationFn: async ({ deliveryBoyData, isUpdate, id }: { 
      deliveryBoyData: Partial<DeliveryBoyInsert>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      if (isUpdate && id) {
        const { error } = await (supabase as any)
          .from('delivery_boys')
          .update(deliveryBoyData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('delivery_boys')
          .insert([deliveryBoyData]);
        if (error) throw error;
      }
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-boys'] });
      toast({ title: `Delivery boy ${isUpdate ? 'updated' : 'added'} successfully!` });
    },
    onError: (error: any, { isUpdate }) => {
      toast({ 
        title: `Failed to ${isUpdate ? 'update' : 'add'} delivery boy`, 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    deliveryBoys,
    isLoading,
    deliveryBoyMutation
  };
};
