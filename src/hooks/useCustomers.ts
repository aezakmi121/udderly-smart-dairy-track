
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
  scheme_id: string | null;
  milk_type: string;
  created_at: string;
  updated_at: string;
  current_credit: number;
  last_payment_date: string | null;
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
  scheme_id?: string | null;
  milk_type?: string;
}

export const useCustomers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
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
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
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
      // Handle phone number duplicate error specifically
      if (error.message?.includes('unique_phone_number')) {
        toast({ 
          title: `Failed to ${isUpdate ? 'update' : 'add'} customer`, 
          description: "A customer with this phone number already exists.",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: `Failed to ${isUpdate ? 'update' : 'add'} customer`, 
          description: error.message,
          variant: "destructive" 
        });
      }
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
