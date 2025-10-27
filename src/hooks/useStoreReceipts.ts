import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoreReceipt {
  id: string;
  receipt_date: string;
  cow_received: number;
  buffalo_received: number;
  mixed_received: number;
  notes?: string;
}

export const useStoreReceipts = (selectedDate: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['store-receipts', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_receipts')
        .select('*')
        .eq('receipt_date', selectedDate)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as StoreReceipt | null;
    }
  });

  const addReceiptMutation = useMutation({
    mutationFn: async (newReceipt: Omit<StoreReceipt, 'id'>) => {
      const { data, error } = await supabase
        .from('store_receipts')
        .insert(newReceipt)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-receipts'] });
      toast({ title: "Store receipt added successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding receipt", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateReceiptMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StoreReceipt> & { id: string }) => {
      const { data, error } = await supabase
        .from('store_receipts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-receipts'] });
      toast({ title: "Receipt updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating receipt", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    receipts,
    isLoading,
    addReceiptMutation,
    updateReceiptMutation
  };
};
