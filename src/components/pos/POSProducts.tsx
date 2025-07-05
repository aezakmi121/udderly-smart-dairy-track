
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Edit2, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePOSData } from '@/hooks/usePOSData';
import { ProductForm } from './products/ProductForm';
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

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(({ product, variant }) => (
                <div key={`${product.id}-${variant.id}`} className="flex justify-between items-center">
                  <span>{product.name} - {variant.name}</span>
                  <Badge variant="destructive">
                    {variant.stock_quantity} left (Alert: {variant.low_stock_alert})
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {product.name}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEditForm(product)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDeleteProduct(product)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
              <Badge variant="secondary">{product.category}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">Unit Type:</span> {product.unit_type}
                  {product.fractional_allowed && (
                    <Badge variant="outline" className="ml-2">Fractional</Badge>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Variants ({product.variants.length})</h4>
                  <div className="space-y-2">
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="text-sm p-2 bg-muted rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{variant.name}</span>
                          <Badge 
                            variant={variant.stock_quantity <= variant.low_stock_alert ? "destructive" : "default"}
                          >
                            {variant.stock_quantity} in stock
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          Size: {variant.size} {variant.unit} • Cost: ₹{variant.cost_price} • Sell: ₹{variant.selling_price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product Form Dialog */}
      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
        isLoading={addProductMutation.isPending || updateProductMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
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
