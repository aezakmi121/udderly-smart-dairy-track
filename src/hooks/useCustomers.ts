
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone_number: string;
  address: string;
  area: string | null;
  daily_quantity: number;
  delivery_time: string;
  subscription_type: string;
  rate_per_liter: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerInsert {
  customer_code: string;
  name: string;
  phone_number: string;
  address: string;
  area?: string | null;
  daily_quantity?: number;
  delivery_time?: string;
  subscription_type?: string;
  rate_per_liter: number;
  credit_limit?: number;
  is_active?: boolean;
}

export const useCustomers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  const customerMutation = useMutation({
    mutationFn: async ({ customerData, isUpdate, id }: { 
      customerData: Partial<CustomerInsert>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      if (isUpdate && id) {
        const { error } = await (supabase as any)
          .from('customers')
          .update(customerData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('customers')
          .insert([customerData as CustomerInsert]);
        if (error) throw error;
      }
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: `Customer ${isUpdate ? 'updated' : 'added'} successfully!` });
    },
    onError: (error: any, { isUpdate }) => {
      toast({ 
        title: `Failed to ${isUpdate ? 'update' : 'add'} customer`, 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const generateCustomerCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `CUST${timestamp}`;
  };

  return {
    customers,
    isLoading,
    customerMutation,
    generateCustomerCode
  };
};
