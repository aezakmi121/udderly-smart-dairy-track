
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

const DEFAULT_CATEGORIES = [
  {
    id: '1',
    name: 'Dairy Products',
    description: 'Milk, curd, cheese and other dairy items',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Snacks',
    description: 'Chips, biscuits, and other snack items',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Beverages',
    description: 'Soft drinks, juices, and other beverages',
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Grains',
    description: 'Rice, wheat, and other grain products',
    created_at: new Date().toISOString(),
  }
];

export const usePOSCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { products } = usePOSProducts();

  const { data: categories } = useQuery({
    queryKey: ['pos-categories', products],
    queryFn: async () => {
      // Get saved categories or use defaults
      const savedCategories = localStorage.getItem('pos-categories');
      let categoryList = savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES;
      
      const productsByCategory = products?.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return categoryList.map((category: any) => ({
        ...category,
        product_count: productsByCategory[category.name] || 0,
      })) as POSCategory[];
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
      
      // Get current categories and remove the one to delete
      const savedCategories = localStorage.getItem('pos-categories');
      let categoryList = savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES;
      
      const updatedCategories = categoryList.filter((cat: any) => cat.name !== categoryName);
      localStorage.setItem('pos-categories', JSON.stringify(updatedCategories));
      
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
      const savedCategories = localStorage.getItem('pos-categories');
      let categoryList = savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES;
      
      if (isUpdate && id) {
        // Update existing category
        categoryList = categoryList.map((cat: any) => 
          cat.id === id ? { ...cat, ...categoryData } : cat
        );
      } else {
        // Add new category
        const newCategory = {
          id: Date.now().toString(),
          ...categoryData,
          created_at: new Date().toISOString(),
        };
        categoryList.push(newCategory);
      }
      
      localStorage.setItem('pos-categories', JSON.stringify(categoryList));
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
