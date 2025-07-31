
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFeedManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch feed categories
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

  // Fetch feed items with categories
  const { data: feedItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['feed-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_items')
        .select(`
          *,
          feed_categories (
            id,
            name
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Get low stock items using client-side filtering
  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Filter items where current_stock is less than minimum_stock_level
      return data?.filter(item => {
        const currentStock = parseFloat(item.current_stock?.toString() || '0');
        const minimumLevel = parseFloat(item.minimum_stock_level?.toString() || '0');
        return currentStock < minimumLevel;
      }) || [];
    },
    enabled: !!feedItems
  });

  // Fetch feed transactions with items
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['feed-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_transactions')
        .select(`
          *,
          feed_items (
            name,
            unit
          )
        `)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const { data, error } = await supabase
        .from('feed_categories')
        .insert(categoryData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-categories'] });
      toast({ title: "Category created successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Create feed item mutation
  const createFeedItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      // Ensure numeric fields are properly converted
      const processedData = {
        ...itemData,
        cost_per_unit: itemData.cost_per_unit ? parseFloat(itemData.cost_per_unit.toString()) : null,
        current_stock: itemData.current_stock ? parseFloat(itemData.current_stock.toString()) : 0,
        minimum_stock_level: itemData.minimum_stock_level ? parseFloat(itemData.minimum_stock_level.toString()) : 0
      };

      const { data, error } = await supabase
        .from('feed_items')
        .insert(processedData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      toast({ title: "Feed item created successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create feed item", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update feed item mutation
  const updateFeedItemMutation = useMutation({
    mutationFn: async ({ id, data: itemData }: { id: string; data: any }) => {
      // Ensure numeric fields are properly converted
      const processedData = {
        ...itemData,
        cost_per_unit: itemData.cost_per_unit ? parseFloat(itemData.cost_per_unit.toString()) : null,
        current_stock: itemData.current_stock ? parseFloat(itemData.current_stock.toString()) : 0,
        minimum_stock_level: itemData.minimum_stock_level ? parseFloat(itemData.minimum_stock_level.toString()) : 0
      };

      const { data, error } = await supabase
        .from('feed_items')
        .update(processedData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      toast({ title: "Feed item updated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update feed item", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      // Ensure numeric fields are properly converted
      const processedData = {
        ...transactionData,
        quantity: parseFloat(transactionData.quantity.toString()),
        unit_cost: transactionData.unit_cost ? parseFloat(transactionData.unit_cost.toString()) : null,
        total_cost: transactionData.total_cost ? parseFloat(transactionData.total_cost.toString()) : null
      };

      const { data, error } = await supabase
        .from('feed_transactions')
        .insert(processedData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
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

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data: categoryData }: { id: string; data: any }) => {
      const { data, error } = await supabase
        .from('feed_categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-categories'] });
      toast({ title: "Category updated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feed_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-categories'] });
      toast({ title: "Category deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete feed item mutation
  const deleteFeedItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feed_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      toast({ title: "Feed item deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete feed item", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data: transactionData }: { id: string; data: any }) => {
      const processedData = {
        ...transactionData,
        quantity: parseFloat(transactionData.quantity.toString()),
        unit_cost: transactionData.unit_cost ? parseFloat(transactionData.unit_cost.toString()) : null,
        total_cost: transactionData.total_cost ? parseFloat(transactionData.total_cost.toString()) : null
      };

      const { data, error } = await supabase
        .from('feed_transactions')
        .update(processedData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      toast({ title: "Transaction updated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update transaction", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feed_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      toast({ title: "Transaction deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete transaction", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    categories,
    feedItems,
    lowStockItems,
    transactions,
    isLoading: categoriesLoading || itemsLoading || transactionsLoading,
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
    createFeedItemMutation,
    updateFeedItemMutation,
    deleteFeedItemMutation,
    createTransactionMutation,
    updateTransactionMutation,
    deleteTransactionMutation
  };
};
