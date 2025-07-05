
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFeedManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['feed-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: feedItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['feed-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_items')
        .select(`
          *,
          feed_categories!category_id (name)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Simplified low stock items query without RPC
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ['low-stock-feed-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_items')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching feed items:', error);
        return [];
      }
      
      // Filter for low stock items in JavaScript
      return data?.filter(item => 
        item.current_stock !== null && 
        item.minimum_stock_level !== null && 
        item.current_stock <= item.minimum_stock_level
      ) || [];
    }
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['feed-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_transactions')
        .select(`
          *,
          feed_items!feed_item_id (name, unit)
        `)
        .order('transaction_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('feed_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-categories'] });
      toast({ title: "Category added successfully!" });
    }
  });

  const addFeedItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from('feed_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-feed-items'] });
      toast({ title: "Feed item added successfully!" });
    }
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: any) => {
      const { data, error } = await supabase
        .from('feed_transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-feed-items'] });
      toast({ title: "Transaction recorded successfully!" });
    }
  });

  return {
    categories,
    feedItems,
    lowStockItems,
    transactions,
    isLoading: categoriesLoading || itemsLoading || transactionsLoading || lowStockLoading,
    addCategoryMutation,
    addFeedItemMutation,
    addTransactionMutation
  };
};
