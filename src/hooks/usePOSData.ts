
import { usePOSProducts } from './pos/usePOSProducts';
import { usePOSCategories } from './pos/usePOSCategories';
import { usePOSStock } from './pos/usePOSStock';

export const usePOSData = () => {
  const {
    products,
    productsLoading,
    addProductMutation,
    updateProductMutation,
    deleteProductMutation
  } = usePOSProducts();

  const {
    categories,
    categoryMutation,
    deleteCategoryMutation
  } = usePOSCategories();

  const {
    updateStockMutation
  } = usePOSStock();

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
