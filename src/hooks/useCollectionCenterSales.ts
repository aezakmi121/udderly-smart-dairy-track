import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CollectionCenterSale {
  id: string;
  sale_date: string;
  customer_name: string;
  quantity: number;
  rate_per_liter: number;
  total_amount?: number;
  payment_status: 'unpaid' | 'paid';
  payment_date?: string;
  payment_month: string;
  notes?: string;
}

export const useCollectionCenterSales = (startDate?: string, endDate?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sales, isLoading } = useQuery({
    queryKey: ['collection-center-sales', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('collection_center_sales')
        .select('*')
        .order('sale_date', { ascending: false });
      
      if (startDate) query = query.gte('sale_date', startDate);
      if (endDate) query = query.lte('sale_date', endDate);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CollectionCenterSale[];
    }
  });

  const { data: monthlySummary } = useQuery({
    queryKey: ['collection-center-monthly-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_center_sales')
        .select('payment_month, total_amount, payment_status')
        .order('payment_month', { ascending: false });
      
      if (error) throw error;

      const grouped = data.reduce((acc: any, sale: any) => {
        const month = sale.payment_month;
        if (!acc[month]) {
          acc[month] = { month, total: 0, paid: 0, unpaid: 0 };
        }
        const amount = Number(sale.total_amount);
        acc[month].total += amount;
        if (sale.payment_status === 'paid') {
          acc[month].paid += amount;
        } else {
          acc[month].unpaid += amount;
        }
        return acc;
      }, {});

      return Object.values(grouped);
    }
  });

  const addSaleMutation = useMutation({
    mutationFn: async (newSale: Omit<CollectionCenterSale, 'id' | 'total_amount'>) => {
      const { data, error } = await supabase
        .from('collection_center_sales')
        .insert(newSale)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-center-sales'] });
      queryClient.invalidateQueries({ queryKey: ['collection-center-monthly-summary'] });
      toast({ title: "Sale added successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CollectionCenterSale> & { id: string }) => {
      const { data, error } = await supabase
        .from('collection_center_sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-center-sales'] });
      queryClient.invalidateQueries({ queryKey: ['collection-center-monthly-summary'] });
      toast({ title: "Sale updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collection_center_sales')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-center-sales'] });
      queryClient.invalidateQueries({ queryKey: ['collection-center-monthly-summary'] });
      toast({ title: "Sale deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error deleting sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('collection_center_sales')
        .update({ payment_status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-center-sales'] });
      queryClient.invalidateQueries({ queryKey: ['collection-center-monthly-summary'] });
      toast({ title: "Sales marked as paid!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error marking as paid", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    sales,
    monthlySummary,
    isLoading,
    addSaleMutation,
    updateSaleMutation,
    deleteSaleMutation,
    markAsPaidMutation
  };
};
