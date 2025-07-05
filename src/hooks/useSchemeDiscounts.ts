
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SchemeProductDiscount {
  id: string;
  scheme_id: string;
  product_id: string;
  discount_type: 'percentage' | 'amount';
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SchemeProductDiscountInsert {
  scheme_id: string;
  product_id: string;
  discount_type: 'percentage' | 'amount';
  discount_value: number;
  is_active?: boolean;
}

export const useSchemeDiscounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: discounts, isLoading } = useQuery({
    queryKey: ['scheme-discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheme_product_discounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SchemeProductDiscount[];
    }
  });

  const discountMutation = useMutation({
    mutationFn: async ({ discountData, isUpdate, id }: { 
      discountData: Partial<SchemeProductDiscountInsert>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      if (isUpdate && id) {
        const { error } = await supabase
          .from('scheme_product_discounts')
          .update(discountData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheme_product_discounts')
          .insert([discountData as SchemeProductDiscountInsert]);
        if (error) throw error;
      }
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['scheme-discounts'] });
      toast({ title: `Discount ${isUpdate ? 'updated' : 'added'} successfully!` });
    },
    onError: (error: any, { isUpdate }) => {
      toast({ 
        title: `Failed to ${isUpdate ? 'update' : 'add'} discount`, 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteDiscount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheme_product_discounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheme-discounts'] });
      toast({ title: "Discount deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete discount", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const getDiscountForProduct = (schemeId: string, productId: string) => {
    return discounts?.find(d => 
      d.scheme_id === schemeId && 
      d.product_id === productId && 
      d.is_active
    );
  };

  return {
    discounts,
    isLoading,
    discountMutation,
    deleteDiscount,
    getDiscountForProduct
  };
};
