
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePOSData } from '@/hooks/usePOSData';
import { ProductForm } from './products/ProductForm';
import { ProductCard } from './products/ProductCard';
import { LowStockAlert } from './products/LowStockAlert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Product {
  id: string;
  name: string;
  category: string;
  variants: any[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
  created_at: string;
}

export const POSProducts = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const { 
    products, 
    productsLoading,
    addProductMutation, 
    updateProductMutation,
    deleteProductMutation
  } = usePOSData();

  const openAddForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSaveProduct = (productData: any) => {
    if (editingProduct) {
      updateProductMutation.mutate({
        id: editingProduct.id,
        productData
      });
    } else {
      addProductMutation.mutate(productData);
    }
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = () => {
    if (deleteProduct) {
      deleteProductMutation.mutate(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const getLowStockVariants = () => {
    const lowStock: { product: any; variant: any }[] = [];
    products?.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.stock_quantity <= variant.low_stock_alert) {
          lowStock.push({ product, variant });
        }
      });
    });
    return lowStock;
  };

  const lowStockItems = getLowStockVariants();

  if (productsLoading) {
    return <div className="text-center py-4">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-muted-foreground">Manage your store products and variants</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <LowStockAlert lowStockItems={lowStockItems} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={openEditForm}
            onDelete={setDeleteProduct}
          />
        ))}
      </div>

      {products?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No products available. Click "Add Product" to get started.
        </div>
      )}

      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
        isLoading={addProductMutation.isPending || updateProductMutation.isPending}
      />

      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
