
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  cost_price?: number; // Made optional
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
  barcode?: string;
}

export const usePOSProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        }
      ] as POSProduct[];
      
      localStorage.setItem('pos-products', JSON.stringify(defaultProducts));
      return defaultProducts;
    }
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

  return {
    products,
    productsLoading,
    addProductMutation,
    updateProductMutation,
    deleteProductMutation
  };
};
