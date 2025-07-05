
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { usePOSProducts } from './usePOSProducts';

export const usePOSStock = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { products } = usePOSProducts();

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

  return {
    updateStockMutation
  };
};
