import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchAllPlantSales } from '@/utils/paginatedFetch';

interface PlantSale {
  id: string;
  sale_date: string;
  quantity: number;
  fat_percentage: number;
  snf_percentage?: number;
  amount_received: number;
  derived_rate?: number;
  payment_status: 'paid' | 'pending';
  payment_date?: string;
  slip_number?: string;
  notes?: string;
}

export const usePlantSales = (startDate?: string, endDate?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plantSales, isLoading } = useQuery({
    queryKey: ['plant-sales', startDate, endDate],
    queryFn: async () => {
      // Use paginated fetch to get all plant sales
      const data = await fetchAllPlantSales(startDate, endDate);
      return data as PlantSale[];
    }
  });

  const { data: summary } = useQuery({
    queryKey: ['plant-sales-summary', startDate, endDate],
    queryFn: async () => {
      const sales = plantSales || [];
      const totalSales = sales.reduce((sum, s) => sum + Number(s.amount_received), 0);
      const totalQuantity = sales.reduce((sum, s) => sum + Number(s.quantity), 0);
      const avgRate = totalQuantity > 0 ? totalSales / totalQuantity : 0;
      const pendingPayments = sales.filter(s => s.payment_status === 'pending').length;

      return {
        totalSales,
        totalQuantity,
        avgRate,
        pendingPayments,
        recordCount: sales.length
      };
    },
    enabled: !!plantSales
  });

  const addSaleMutation = useMutation({
    mutationFn: async (newSale: Omit<PlantSale, 'id' | 'derived_rate'>) => {
      const { data, error } = await supabase
        .from('plant_sales')
        .insert(newSale)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-sales'] });
      toast({ title: "Plant sale added successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding plant sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlantSale> & { id: string }) => {
      const { data, error } = await supabase
        .from('plant_sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-sales'] });
      toast({ title: "Plant sale updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating plant sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plant_sales')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-sales'] });
      toast({ title: "Plant sale deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error deleting plant sale", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    plantSales,
    summary,
    isLoading,
    addSaleMutation,
    updateSaleMutation,
    deleteSaleMutation
  };
};
