
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Edit2, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePOSData } from '@/hooks/usePOSData';

interface ProductVariant {
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

export const POSProducts = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const { toast } = useToast();
  const { products, addProductMutation } = usePOSData();

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: Date.now().toString(),
      name: '',
      size: 0,
      unit: '',
      cost_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      low_stock_alert: 0,
    };
    setVariants([...variants, newVariant]);
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    setVariants(variants.map(variant => 
      variant.id === id ? { ...variant, [field]: value } : variant
    ));
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(variant => variant.id !== id));
  };

  const handleSaveProduct = () => {
    const formData = new FormData(document.querySelector('form') as HTMLFormElement);
    
    const productData = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      unit_type: formData.get('unit_type') as 'weight' | 'volume' | 'piece',
      fractional_allowed: formData.get('fractional') === 'on',
      variants: variants.filter(v => v.name && v.size > 0)
    };

    if (!productData.name || !productData.category || variants.length === 0) {
      toast({ title: "Please fill all required fields and add at least one variant", variant: "destructive" });
      return;
    }

    addProductMutation.mutate(productData);
    setIsDialogOpen(false);
    setVariants([]);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-muted-foreground">Manage your store products and variants</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Name *</Label>
                  <Input name="name" placeholder="Enter product name" required />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dairy">Dairy</SelectItem>
                      <SelectItem value="snacks">Snacks</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit Type *</Label>
                  <Select name="unit_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight">Weight (kg, g)</SelectItem>
                      <SelectItem value="volume">Volume (L, ml)</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="fractional" name="fractional" />
                  <Label htmlFor="fractional">Allow Fractional Quantities</Label>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Product Variants</h3>
                  <Button type="button" onClick={addVariant} variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Variant
                  </Button>
                </div>
                
                {variants.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-7 gap-2 text-sm font-medium">
                      <div>Name *</div>
                      <div>Size *</div>
                      <div>Unit *</div>
                      <div>Cost Price *</div>
                      <div>Selling Price *</div>
                      <div>Stock *</div>
                      <div>Action</div>
                    </div>
                    {variants.map((variant) => (
                      <div key={variant.id} className="grid grid-cols-7 gap-2">
                        <Input 
                          placeholder="1L Pouch" 
                          value={variant.name}
                          onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                        />
                        <Input 
                          placeholder="1" 
                          type="number"
                          value={variant.size || ''}
                          onChange={(e) => updateVariant(variant.id, 'size', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                          placeholder="L" 
                          value={variant.unit}
                          onChange={(e) => updateVariant(variant.id, 'unit', e.target.value)}
                        />
                        <Input 
                          placeholder="45" 
                          type="number"
                          value={variant.cost_price || ''}
                          onChange={(e) => updateVariant(variant.id, 'cost_price', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                          placeholder="55" 
                          type="number"
                          value={variant.selling_price || ''}
                          onChange={(e) => updateVariant(variant.id, 'selling_price', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                          placeholder="50" 
                          type="number"
                          value={variant.stock_quantity || ''}
                          onChange={(e) => updateVariant(variant.id, 'stock_quantity', parseFloat(e.target.value) || 0)}
                        />
                        <Button 
                          type="button"
                          onClick={() => removeVariant(variant.id)} 
                          variant="destructive" 
                          size="sm"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveProduct}>
                  Save Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                <Button size="sm" variant="outline">
                  <Edit2 className="h-3 w-3" />
                </Button>
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
                          Cost: ₹{variant.cost_price} • Sell: ₹{variant.selling_price}
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
    </div>
  );
};
