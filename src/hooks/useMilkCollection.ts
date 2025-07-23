
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

  const { data: collections, isLoading, error } = useQuery({
    queryKey: ['milk-collections'],
    queryFn: async () => {
      console.log('Fetching milk collections...');
      const { data, error } = await supabase
        .from('milk_collections')
        .select(`
          *,
          farmers!milk_collections_farmer_id_fkey (name, farmer_code)
        `)
        .order('collection_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching milk collections:', error);
        throw error;
      }
      console.log('Milk collections fetched:', data);
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
    onSuccess: (data) => {
      console.log('Milk collection added successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['milk-collections'] });
      toast({ title: "Milk collection recorded successfully!" });
    },
    onError: (error) => {
      console.error('Error adding milk collection:', error);
      toast({ 
        title: "Failed to record milk collection", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milk_collections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-collections'] });
      toast({ title: "Collection record deleted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete collection record", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    collections,
    farmers,
    isLoading,
    addCollectionMutation,
    deleteCollectionMutation
  };
};
