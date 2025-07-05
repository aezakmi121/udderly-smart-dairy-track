
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerAllocation {
  id: string;
  customer_id: string;
  delivery_boy_id: string;
  allocated_date: string;
  is_active: boolean;
  allocated_by: string;
  created_at: string;
  customers: {
    id: string;
    name: string;
    customer_code: string;
    address: string;
    phone_number: string;
    daily_quantity: number;
    rate_per_liter: number;
  };
  delivery_boys: {
    id: string;
    name: string;
    phone_number: string;
  };
}

export const useCustomerAllocations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['customer-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_allocations')
        .select(`
          *,
          customers (
            id, name, customer_code, address, phone_number, daily_quantity, rate_per_liter
          ),
          delivery_boys (
            id, name, phone_number
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomerAllocation[];
    },
  });

  const allocateCustomer = useMutation({
    mutationFn: async ({ customerId, deliveryBoyId }: { customerId: string, deliveryBoyId: string }) => {
      const { error } = await supabase
        .from('customer_allocations')
        .insert({
          customer_id: customerId,
          delivery_boy_id: deliveryBoyId,
          allocated_by: (await supabase.auth.getUser()).data.user?.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-allocations'] });
      toast({ title: 'Customer allocated successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to allocate customer', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const removeAllocation = useMutation({
    mutationFn: async (allocationId: string) => {
      const { error } = await supabase
        .from('customer_allocations')
        .update({ is_active: false })
        .eq('id', allocationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-allocations'] });
      toast({ title: 'Customer allocation removed!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to remove allocation', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  return {
    allocations: allocations || [],
    isLoading,
    allocateCustomer,
    removeAllocation
  };
};
