
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface POSProduct {
  id: string;
  name: string;
  category: string;
  variants: POSProductVariant[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
  created_at: string;
}

interface POSProductVariant {
  id: string;
  name: string;
  size: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
  barcode?: string;
}

interface POSCategory {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

export const usePOSData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for now - will be replaced with actual database calls
  const { data: products } = useQuery({
    queryKey: ['pos-products'],
    queryFn: async () => {
      // Mock data
      return [
        {
          id: '1',
          name: 'Cow Milk',
          category: 'Dairy',
          unit_type: 'volume' as const,
          fractional_allowed: true,
          variants: [
            {
              id: '1-1',
              name: '1 Liter Pouch',
              size: 1,
              unit: 'L',
              cost_price: 45,
              selling_price: 55,
              stock_quantity: 50,
              low_stock_alert: 10,
            },
            {
              id: '1-2',
              name: '500ml Pouch',
              size: 0.5,
              unit: 'L',
              cost_price: 25,
              selling_price: 30,
              stock_quantity: 30,
              low_stock_alert: 5,
            }
          ],
          created_at: new Date().toISOString(),
        }
      ] as POSProduct[];
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: async () => {
      return [
        {
          id: '1',
          name: 'Dairy Products',
          description: 'Milk, curd, cheese and other dairy items',
          product_count: 5,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Snacks',
          description: 'Chips, biscuits, and other snack items',
          product_count: 12,
          created_at: new Date().toISOString(),
        }
      ] as POSCategory[];
    }
  });

  const addProductMutation = useMutation({
    mutationFn: async (productData: Partial<POSProduct>) => {
      // Mock implementation
      console.log('Adding product:', productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      toast({ title: "Product added successfully!" });
    }
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ variantId, quantity, type }: { variantId: string; quantity: number; type: 'add' | 'remove' }) => {
      console.log('Updating stock:', { variantId, quantity, type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      toast({ title: "Stock updated successfully!" });
    }
  });

  const categoryMutation = useMutation({
    mutationFn: async ({ categoryData, isUpdate, id }: { 
      categoryData: Partial<POSCategory>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      console.log('Category operation:', { categoryData, isUpdate, id });
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['pos-categories'] });
      toast({ title: `Category ${isUpdate ? 'updated' : 'added'} successfully!` });
    }
  });

  return {
    products,
    categories,
    addProductMutation,
    updateStockMutation,
    categoryMutation
  };
};
