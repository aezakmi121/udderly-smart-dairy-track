
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, AlertTriangle, TrendingDown, Plus, Minus } from 'lucide-react';
import { usePOSData } from '@/hooks/usePOSData';

interface StockUpdateItem {
  variantId: string;
  productName: string;
  variantName: string;
  currentStock: number;
}

export const POSInventory = () => {
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockUpdateItem | null>(null);
  const [updateQuantity, setUpdateQuantity] = useState(0);
  const [updateType, setUpdateType] = useState<'add' | 'remove'>('add');
  const { products, updateStockMutation } = usePOSData();

  const inventoryItems = products?.flatMap(product => 
    product.variants.map(variant => ({
      id: `${product.id}-${variant.id}`,
      name: `${product.name} - ${variant.name}`,
      category: product.category,
      current_stock: variant.stock_quantity,
      low_stock_alert: variant.low_stock_alert,
      cost_price: variant.cost_price,
      selling_price: variant.selling_price,
      last_updated: product.created_at,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name
    }))
  ) || [];

  const lowStockItems = inventoryItems.filter(item => item.current_stock <= item.low_stock_alert);

  const openStockDialog = (item: any, type: 'add' | 'remove') => {
    setSelectedItem({
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      currentStock: item.current_stock
    });
    setUpdateType(type);
    setUpdateQuantity(0);
    setIsStockDialogOpen(true);
  };

  const handleStockUpdate = () => {
    if (!selectedItem || updateQuantity <= 0) return;

    updateStockMutation.mutate({
      variantId: selectedItem.variantId,
      quantity: updateQuantity,
      type: updateType
    });

    setIsStockDialogOpen(false);
    setSelectedItem(null);
    setUpdateQuantity(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">Track stock levels and manage inventory</p>
        </div>
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {updateType === 'add' ? 'Add Stock' : 'Remove Stock'}
              </DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div>
                  <Label>Product</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.productName} - {selectedItem.variantName}
                  </p>
                  <p className="text-sm">Current Stock: {selectedItem.currentStock}</p>
                </div>
                <div>
                  <Label>Quantity to {updateType === 'add' ? 'Add' : 'Remove'}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={updateQuantity}
                    onChange={(e) => setUpdateQuantity(parseInt(e.target.value) || 0)}
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStockUpdate}>
                    {updateType === 'add' ? 'Add Stock' : 'Remove Stock'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert ({lowStockItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="destructive">
                    {item.current_stock} left (Alert: {item.low_stock_alert})
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventoryItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.name}</h4>
                    <Badge variant="outline">{item.category}</Badge>
                    {item.current_stock <= item.low_stock_alert && (
                      <Badge variant="destructive">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Cost: ₹{item.cost_price} • Sell: ₹{item.selling_price} • 
                    Last updated: {new Date(item.last_updated).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <div className="text-lg font-bold">{item.current_stock}</div>
                    <div className="text-sm text-muted-foreground">in stock</div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openStockDialog(item, 'add')}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openStockDialog(item, 'remove')}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
