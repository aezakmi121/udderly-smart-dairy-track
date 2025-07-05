
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone_number: string;
  address: string;
  area?: string;
  rate_per_liter: number;
  daily_quantity?: number;
  subscription_type?: string;
  delivery_time?: string;
  milk_type?: string;
  scheme_id?: string;
  current_credit?: number;
  credit_limit?: number;
  last_payment_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCustomers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateCustomerCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CUST${timestamp}${random}`;
  };

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching customers:', error);
          return [];
        }
        return data as Customer[];
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const customerMutation = useMutation({
    mutationFn: async ({ customerData, isUpdate, id }: { 
      customerData: Partial<Customer>, 
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
          .insert(customerData as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: `Customer ${isUpdate ? 'updated' : 'added'} successfully!` });
    },
    onError: (error: any, { isUpdate }) => {
      console.error('Customer mutation error:', error);
      toast({ 
        title: `Failed to ${isUpdate ? 'update' : 'add'} customer`, 
        description: error.message || 'Please check your permissions',
        variant: "destructive" 
      });
    }
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "Customer deleted successfully!" });
    },
    onError: (error: any) => {
      console.error('Delete customer error:', error);
      toast({ 
        title: "Failed to delete customer", 
        description: error.message || 'Please check your permissions',
        variant: "destructive" 
      });
    }
  });

  // Bulk upload customers
  const bulkUploadCustomers = useMutation({
    mutationFn: async (customers: any[]) => {
      const { error } = await supabase
        .from('customers')
        .insert(customers);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "Customers uploaded successfully!" });
    },
    onError: (error: any) => {
      console.error('Bulk upload error:', error);
      toast({ 
        title: "Failed to upload customers", 
        description: error.message || 'Please check your data and permissions',
        variant: "destructive" 
      });
    }
  });

  return {
    customers: customers || [],
    isLoading,
    error,
    customerMutation,
    deleteCustomer,
    bulkUploadCustomers,
    generateCustomerCode
  };
};
