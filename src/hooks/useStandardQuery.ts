import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StandardQueryConfig<T = any> {
  table: string;
  queryKey: string[];
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
}

export interface StandardMutationConfig {
  table: string;
  invalidateQueries: string[][];
  successMessage?: string;
  errorMessage?: string;
}

export const useStandardQuery = <T = any>({
  table,
  queryKey,
  select = '*',
  filters = {},
  orderBy
}: StandardQueryConfig<T>) => {
  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = (supabase as any).from(table).select(select);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      
      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    }
  });
};

export const useStandardMutation = (config: StandardMutationConfig) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any).from(config.table).insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      config.invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      if (config.successMessage) {
        toast({ title: config.successMessage });
      }
    },
    onError: (error) => {
      toast({
        title: config.errorMessage || 'Error occurred',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await (supabase as any).from(config.table).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      config.invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      if (config.successMessage) {
        toast({ title: config.successMessage });
      }
    },
    onError: (error) => {
      toast({
        title: config.errorMessage || 'Error occurred',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(config.table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      config.invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      if (config.successMessage) {
        toast({ title: 'Item deleted successfully' });
      }
    },
    onError: (error) => {
      toast({
        title: config.errorMessage || 'Error occurred',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation
  };
};