
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DailyDelivery {
  id: string;
  delivery_date: string;
  customer_id: string;
  delivery_boy_id: string;
  scheduled_quantity: number;
  actual_quantity: number;
  status: 'pending' | 'delivered' | 'not_taken' | 'partial';
  notes: string;
  rate_per_liter: number;
  total_amount: number;
  delivered_at: string;
  customers: {
    id: string;
    name: string;
    customer_code: string;
    address: string;
    phone_number: string;
    area: string;
  };
}

export const useDailyDeliveries = (deliveryBoyId?: string, date?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['daily-deliveries', deliveryBoyId, date],
    queryFn: async () => {
      let query = supabase
        .from('daily_deliveries')
        .select(`
          *,
          customers (
            id, name, customer_code, address, phone_number, area
          )
        `)
        .order('customers(name)', { ascending: true });

      if (deliveryBoyId) {
        query = query.eq('delivery_boy_id', deliveryBoyId);
      }
      
      if (date) {
        query = query.eq('delivery_date', date);
      } else {
        query = query.eq('delivery_date', new Date().toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as DailyDelivery[];
    },
  });

  const updateDelivery = useMutation({
    mutationFn: async ({ 
      deliveryId, 
      actualQuantity, 
      status, 
      notes 
    }: { 
      deliveryId: string; 
      actualQuantity: number; 
      status: string; 
      notes?: string; 
    }) => {
      const updateData: any = {
        actual_quantity: actualQuantity,
        status: status,
        delivered_at: new Date().toISOString()
      };
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('daily_deliveries')
        .update(updateData)
        .eq('id', deliveryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-deliveries'] });
      toast({ title: 'Delivery updated successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update delivery', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const generateDeliveries = useMutation({
    mutationFn: async (targetDate?: string) => {
      const { data, error } = await supabase.rpc('create_daily_deliveries_for_date', {
        target_date: targetDate || new Date().toISOString().split('T')[0]
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['daily-deliveries'] });
      toast({ title: `Generated ${count} delivery records for today!` });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to generate deliveries', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  return {
    deliveries: deliveries || [],
    isLoading,
    updateDelivery,
    generateDeliveries
  };
};
