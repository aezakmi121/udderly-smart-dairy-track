
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Edit2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
  created_at: string;
}

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
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Cow Milk',
      category: 'Dairy',
      unit_type: 'volume',
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
  ]);
  const { toast } = useToast();

  const handleAddProduct = () => {
    toast({ title: "Product form would open here" });
    setIsDialogOpen(true);
  };

  const getLowStockVariants = () => {
    const lowStock: { product: Product; variant: ProductVariant }[] = [];
    products.forEach(product => {
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
            <Button onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Name</Label>
                  <Input placeholder="Enter product name" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select>
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
                  <Label>Unit Type</Label>
                  <Select>
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
                  <input type="checkbox" id="fractional" />
                  <Label htmlFor="fractional">Allow Fractional Quantities</Label>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Product Variants</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-2 text-sm font-medium">
                    <div>Variant Name</div>
                    <div>Size & Unit</div>
                    <div>Cost Price</div>
                    <div>Selling Price</div>
                    <div>Stock</div>
                    <div>Low Stock Alert</div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <Input placeholder="e.g., 1L Pouch" />
                    <Input placeholder="1 L" />
                    <Input placeholder="45" type="number" />
                    <Input placeholder="55" type="number" />
                    <Input placeholder="50" type="number" />
                    <Input placeholder="10" type="number" />
                  </div>
                </div>
                <Button className="mt-2" variant="outline" size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Variant
                </Button>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>Save Product</Button>
              </div>
            </div>
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
        {products.map((product) => (
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
