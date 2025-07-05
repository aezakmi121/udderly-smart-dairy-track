
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

interface MilkSchemeInsert {
  scheme_name: string;
  cow_milk_rate: number;
  buffalo_milk_rate: number;
  discount_type: 'amount' | 'percentage';
  discount_value: number;
  is_active?: boolean;
}

export const useMilkSchemes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schemes, isLoading } = useQuery({
    queryKey: ['milk-schemes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_schemes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MilkScheme[];
    }
  });

  const schemeMutation = useMutation({
    mutationFn: async ({ schemeData, isUpdate, id }: { 
      schemeData: Partial<MilkSchemeInsert>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      if (isUpdate && id) {
        const { error } = await supabase
          .from('milk_schemes')
          .update(schemeData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('milk_schemes')
          .insert([schemeData as MilkSchemeInsert]);
        if (error) throw error;
      }
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['milk-schemes'] });
      toast({ title: `Scheme ${isUpdate ? 'updated' : 'added'} successfully!` });
    },
    onError: (error: any, { isUpdate }) => {
      toast({ 
        title: `Failed to ${isUpdate ? 'update' : 'add'} scheme`, 
        description: error.message,
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
      toast({ 
        title: "Failed to delete scheme", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    schemes,
    isLoading,
    schemeMutation,
    deleteScheme
  };
};
