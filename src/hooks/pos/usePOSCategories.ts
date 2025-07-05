
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { usePOSProducts } from './usePOSProducts';

interface POSCategory {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

export const usePOSCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { products } = usePOSProducts();

  const { data: categories } = useQuery({
    queryKey: ['pos-categories', products],
    queryFn: async () => {
      const productsByCategory = products?.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return [
        {
          id: '1',
          name: 'Dairy Products',
          description: 'Milk, curd, cheese and other dairy items',
          product_count: productsByCategory['Dairy Products'] || 0,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Snacks',
          description: 'Chips, biscuits, and other snack items',
          product_count: productsByCategory['Snacks'] || 0,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Beverages',
          description: 'Soft drinks, juices, and other beverages',
          product_count: productsByCategory['Beverages'] || 0,
          created_at: new Date().toISOString(),
        },
        {
          id: '4',
          name: 'Grains',
          description: 'Rice, wheat, and other grain products',
          product_count: productsByCategory['Grains'] || 0,
          created_at: new Date().toISOString(),
        }
      ] as POSCategory[];
    },
    enabled: !!products
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const currentProducts = products || [];
      const productsInCategory = currentProducts.filter(product => product.category === categoryName);
      
      if (productsInCategory.length > 0) {
        throw new Error(`Cannot delete category "${categoryName}" because it contains ${productsInCategory.length} products. Please delete or move the products first.`);
      }
      
      return categoryName;
    },
    onSuccess: (categoryName) => {
      queryClient.invalidateQueries({ queryKey: ['pos-categories'] });
      toast({ title: `Category "${categoryName}" deleted successfully!` });
    },
    onError: (error: any) => {
      toast({ 
        title: "Cannot delete category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const categoryMutation = useMutation({
    mutationFn: async ({ categoryData, isUpdate, id }: { 
      categoryData: Partial<POSCategory>, 
      isUpdate: boolean, 
      id?: string 
    }) => {
      console.log('Category operation:', { categoryData, isUpdate, id });
      return { categoryData, isUpdate, id };
    },
    onSuccess: (_, { isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['pos-categories'] });
      toast({ title: `Category ${isUpdate ? 'updated' : 'added'} successfully!` });
    }
  });

  return {
    categories,
    categoryMutation,
    deleteCategoryMutation
  };
};
