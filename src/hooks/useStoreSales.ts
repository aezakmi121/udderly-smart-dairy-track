import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoreSale {
  id: string;
  sale_date: string;
  cash_amount: number;
  upi_amount: number;
  credit_amount: number;
  total_amount?: number;
  notes?: string;
}

export const useStoreSales = (startDate?: string, endDate?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: storeSales, isLoading } = useQuery({
    queryKey: ['store-sales', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('store_sales')
        .select('*')
        .order('sale_date', { ascending: false });
      
      if (startDate) query = query.gte('sale_date', startDate);
      if (endDate) query = query.lte('sale_date', endDate);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StoreSale[];
    }
  });

  const { data: summary } = useQuery({
    queryKey: ['store-sales-summary', startDate, endDate],
    queryFn: async () => {
      const sales = storeSales || [];
      const totalCash = sales.reduce((sum, s) => sum + Number(s.cash_amount), 0);
      const totalUPI = sales.reduce((sum, s) => sum + Number(s.upi_amount), 0);
      const totalCredit = sales.reduce((sum, s) => sum + Number(s.credit_amount), 0);
      const totalSales = totalCash + totalUPI + totalCredit;

      return {
        totalSales,
        totalCash,
        totalUPI,
        totalCredit,
        recordCount: sales.length
      };
    },
    enabled: !!storeSales
  });

  const addSaleMutation = useMutation({
    mutationFn: async (newSale: Omit<StoreSale, 'id' | 'total_amount'>) => {
      const { data, error } = await supabase
        .from('store_sales')
        .insert(newSale)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-sales'] });
      toast({ title: "Store sale added successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding store sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StoreSale> & { id: string }) => {
      const { data, error } = await supabase
        .from('store_sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-sales'] });
      toast({ title: "Store sale updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating store sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_sales')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-sales'] });
      toast({ title: "Store sale deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error deleting store sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    storeSales,
    summary,
    isLoading,
    addSaleMutation,
    updateSaleMutation,
    deleteSaleMutation
  };
};
