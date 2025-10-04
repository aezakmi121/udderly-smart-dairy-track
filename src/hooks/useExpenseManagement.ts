import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface ExpenseSource {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  is_active: boolean;
}

export interface PaidByPerson {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  payment_date: string;
  payment_period: string;
  amount: number;
  description?: string;
  paid_by?: string;
  vendor_name?: string;
  receipt_url?: string;
  
  
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  is_recurring: boolean;
  recurring_frequency?: string;
  tags?: any;
  notes?: string;
  category_id?: string;
  source_id?: string;
  payment_method_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  expense_categories?: ExpenseCategory;
  expense_sources?: ExpenseSource;
  payment_methods?: PaymentMethod;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  sourceIds?: string[];
  status?: string[];
  minAmount?: number;
  maxAmount?: number;
  paidBy?: string;
}

export const useExpenseManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch expenses with filters
  const useExpenses = (filters?: ExpenseFilters) => {
    return useQuery({
      queryKey: ['expenses', filters],
      queryFn: async () => {
        let query = supabase
          .from('expenses')
          .select(`
            id, payment_date, payment_period, amount, description, 
            paid_by, vendor_name, receipt_url, status, is_recurring, 
            recurring_frequency, tags, notes, category_id, 
            source_id, payment_method_id, created_by, 
            created_at, updated_at,
            expense_categories!category_id(id, name),
            expense_sources!source_id(id, name),
            payment_methods!payment_method_id(id, name)
          `)
          .order('payment_date', { ascending: false });

        if (filters?.startDate) {
          query = query.gte('payment_date', filters.startDate);
        }
        if (filters?.endDate) {
          query = query.lte('payment_date', filters.endDate);
        }
        if (filters?.categoryIds?.length) {
          query = query.in('category_id', filters.categoryIds);
        }
        if (filters?.sourceIds?.length) {
          query = query.in('source_id', filters.sourceIds);
        }
        if (filters?.status?.length) {
          query = query.in('status', filters.status as ('pending' | 'paid' | 'overdue' | 'cancelled')[]);
        }
        if (filters?.minAmount) {
          query = query.gte('amount', filters.minAmount);
        }
        if (filters?.maxAmount) {
          query = query.lte('amount', filters.maxAmount);
        }
        if (filters?.paidBy) {
          query = query.ilike('paid_by', `%${filters.paidBy}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Expense[];
      },
    });
  };

  // Fetch categories
  const useCategories = () => {
    return useQuery({
      queryKey: ['expense-categories'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data as ExpenseCategory[];
      },
    });
  };

  // Fetch sources
  const useSources = () => {
    return useQuery({
      queryKey: ['expense-sources'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('expense_sources')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data as ExpenseSource[];
      },
    });
  };

  // Fetch payment methods
  const usePaymentMethods = () => {
    return useQuery({
      queryKey: ['payment-methods'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data as PaymentMethod[];
      },
    });
  };

  // Fetch paid by people
  const usePaidByPeople = () => {
    return useQuery({
      queryKey: ['paid-by-people'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('paid_by_people')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data as PaidByPerson[];
      },
    });
  };

  // Create expense
  const createExpense = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense created successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create expense', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update expense
  const updateExpense = useMutation({
    mutationFn: async ({ id, ...expense }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(expense)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense updated successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update expense', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete expense
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense deleted successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete expense', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Create paid by person
  const createPaidByPerson = useMutation({
    mutationFn: async (person: { name: string }) => {
      const { data, error } = await supabase
        .from('paid_by_people')
        .insert(person)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-by-people'] });
      toast({ title: 'Person added successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to add person', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete paid by person
  const deletePaidByPerson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paid_by_people')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-by-people'] });
      toast({ title: 'Person deleted successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete person', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Create category
  const createCategory = useMutation({
    mutationFn: async (category: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: 'Category added successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to add category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update category
  const updateCategory = useMutation({
    mutationFn: async ({ id, ...category }: { id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: 'Category updated successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete category
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: 'Category deleted successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Create source
  const createSource = useMutation({
    mutationFn: async (source: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('expense_sources')
        .insert(source)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      toast({ title: 'Source added successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to add source', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update source
  const updateSource = useMutation({
    mutationFn: async ({ id, ...source }: { id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('expense_sources')
        .update(source)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      toast({ title: 'Source updated successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update source', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete source
  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_sources')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      toast({ title: 'Source deleted successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete source', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Create payment method
  const createPaymentMethod = useMutation({
    mutationFn: async (method: { name: string }) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(method)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ title: 'Payment method added successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to add payment method', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update payment method
  const updatePaymentMethod = useMutation({
    mutationFn: async ({ id, ...method }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .update(method)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ title: 'Payment method updated successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update payment method', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete payment method
  const deletePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ title: 'Payment method deleted successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete payment method', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    useExpenses,
    useCategories,
    useSources,
    usePaymentMethods,
    usePaidByPeople,
    createExpense,
    updateExpense,
    deleteExpense,
    createPaidByPerson,
    deletePaidByPerson,
    createCategory,
    updateCategory,
    deleteCategory,
    createSource,
    updateSource,
    deleteSource,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
  };
};