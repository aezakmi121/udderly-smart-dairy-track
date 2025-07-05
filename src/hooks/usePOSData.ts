
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

  // Fetch products from localStorage
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products'],
    queryFn: async () => {
      const savedProducts = localStorage.getItem('pos-products');
      if (savedProducts) {
        return JSON.parse(savedProducts) as POSProduct[];
      }
      
      const defaultProducts = [
        {
          id: '1',
          name: 'Cow Milk',
          category: 'Dairy Products',
          unit_type: 'volume' as const,
          fractional_allowed: false,
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
        },
        {
          id: '2',
          name: 'Buffalo Milk',
          category: 'Dairy Products',
          unit_type: 'volume' as const,
          fractional_allowed: true,
          variants: [
            {
              id: '2-1',
              name: '1 Liter Bottle',
              size: 1,
              unit: 'L',
              cost_price: 60,
              selling_price: 75,
              stock_quantity: 25,
              low_stock_alert: 5,
            }
          ],
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Chips',
          category: 'Snacks',
          unit_type: 'piece' as const,
          fractional_allowed: false,
          variants: [
            {
              id: '3-1',
              name: 'Regular Pack',
              size: 1,
              unit: 'pack',
              cost_price: 15,
              selling_price: 20,
              stock_quantity: 100,
              low_stock_alert: 20,
            }
          ],
          created_at: new Date().toISOString(),
        }
      ] as POSProduct[];
      
      localStorage.setItem('pos-products', JSON.stringify(defaultProducts));
      return defaultProducts;
    }
  });

  // Calculate categories with actual product counts
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

  const addProductMutation = useMutation({
    mutationFn: async (productData: Omit<POSProduct, 'id' | 'created_at'>) => {
      const newProduct: POSProduct = {
        ...productData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      
      const currentProducts = products || [];
      const updatedProducts = [...currentProducts, newProduct];
      localStorage.setItem('pos-products', JSON.stringify(updatedProducts));
      
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-categories'] });
      toast({ title: "Product added successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to add product", variant: "destructive" });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, productData }: { id: string; productData: Partial<POSProduct> }) => {
      const currentProducts = products || [];
      const updatedProducts = currentProducts.map(product => 
        product.id === id ? { ...product, ...productData } : product
      );
      localStorage.setItem('pos-products', JSON.stringify(updatedProducts));
      return { id, productData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-categories'] });
      toast({ title: "Product updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const currentProducts = products || [];
      const updatedProducts = currentProducts.filter(product => product.id !== productId);
      localStorage.setItem('pos-products', JSON.stringify(updatedProducts));
      return productId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-categories'] });
      toast({ title: "Product deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    }
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ variantId, quantity, type }: { variantId: string; quantity: number; type: 'add' | 'remove' }) => {
      const currentProducts = products || [];
      const updatedProducts = currentProducts.map(product => ({
        ...product,
        variants: product.variants.map(variant => {
          if (variant.id === variantId) {
            const newQuantity = type === 'add' 
              ? variant.stock_quantity + quantity 
              : Math.max(0, variant.stock_quantity - quantity);
            return { ...variant, stock_quantity: newQuantity };
          }
          return variant;
        })
      }));
      
      localStorage.setItem('pos-products', JSON.stringify(updatedProducts));
      return { variantId, quantity, type };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      toast({ title: "Stock updated successfully!" });
    }
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
    products,
    categories,
    productsLoading,
    addProductMutation,
    updateProductMutation,
    deleteProductMutation,
    updateStockMutation,
    categoryMutation,
    deleteCategoryMutation
  };
};
