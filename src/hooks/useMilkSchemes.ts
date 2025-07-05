
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilkScheme {
  id: string;
  scheme_name: string;
  cow_milk_rate: number;
  buffalo_milk_rate: number;
  discount_type: 'amount' | 'percentage';
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useMilkSchemes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schemes, isLoading, error } = useQuery({
    queryKey: ['milk-schemes'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('milk_schemes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching milk schemes:', error);
          return [];
        }
        return data as MilkScheme[];
      } catch (error) {
        console.error('Failed to fetch milk schemes:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const schemeMutation = useMutation({
    mutationFn: async ({ schemeData, isUpdate, id }: { 
      schemeData: Partial<MilkScheme>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      if (isUpdate && id) {
        const { data, error } = await supabase
          .from('milk_schemes')
          .update(schemeData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('milk_schemes')
          .insert(schemeData as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['milk-schemes'] });
      toast({ title: `Scheme ${isUpdate ? 'updated' : 'created'} successfully!` });
    },
    onError: (error: any, { isUpdate }) => {
      console.error('Scheme mutation error:', error);
      toast({ 
        title: `Failed to ${isUpdate ? 'update' : 'create'} scheme`, 
        description: error.message || 'Please check your permissions',
        variant: "destructive" 
      });
    }
  });

  const deleteScheme = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milk_schemes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-schemes'] });
      toast({ title: "Scheme deleted successfully!" });
    },
    onError: (error: any) => {
      console.error('Delete scheme error:', error);
      toast({ 
        title: "Failed to delete scheme", 
        description: error.message || 'Please check your permissions',
        variant: "destructive" 
      });
    }
  });

  return {
    schemes: schemes || [],
    isLoading,
    error,
    schemeMutation,
    deleteScheme
  };
};
