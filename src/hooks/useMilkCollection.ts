
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilkCollection {
  id: string;
  farmer_id?: string;
  collection_date: string;
  session: 'morning' | 'evening';
  quantity: number;
  fat_percentage: number;
  snf_percentage: number;
  rate_per_liter: number;
  total_amount: number;
  is_accepted?: boolean;
  remarks?: string;
}

export const useMilkCollection = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ['milk-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_collections')
        .select(`
          *,
          farmers!farmer_id (name, farmer_code)
        `)
        .order('collection_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: farmers } = useQuery({
    queryKey: ['farmers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, name, farmer_code')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const addCollectionMutation = useMutation({
    mutationFn: async (newCollection: Omit<MilkCollection, 'id'>) => {
      const { data, error } = await supabase
        .from('milk_collections')
        .insert(newCollection)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-collections'] });
      toast({ title: "Milk collection recorded successfully!" });
    }
  });

  return {
    collections,
    farmers,
    isLoading,
    addCollectionMutation
  };
};
