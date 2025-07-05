
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreditTransaction {
  id: string;
  customer_id: string;
  transaction_type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  created_by: string | null;
}

export const useCreditTransactions = (customerId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['credit-transactions', customerId],
    queryFn: async () => {
      let query = supabase
        .from('customer_credit_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!customerId
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: {
      customer_id: string;
      transaction_type: 'credit_sale' | 'payment' | 'adjustment';
      amount: number;
      description?: string;
      reference_id?: string;
    }) => {
      const { error } = await supabase
        .from('customer_credit_transactions')
        .insert([transaction]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "Transaction recorded successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to record transaction",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    transactions,
    isLoading,
    addTransaction
  };
};
