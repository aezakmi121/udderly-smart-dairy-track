
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, TrendingDown } from 'lucide-react';

export const POSInventory = () => {
  const inventoryItems = [
    {
      id: '1',
      name: 'Cow Milk 1L',
      category: 'Dairy',
      current_stock: 50,
      low_stock_alert: 10,
      cost_price: 45,
      selling_price: 55,
      last_updated: '2024-01-15'
    },
    {
      id: '2',
      name: 'Cow Milk 500ml',
      category: 'Dairy',
      current_stock: 5,
      low_stock_alert: 10,
      cost_price: 25,
      selling_price: 30,
      last_updated: '2024-01-15'
    }
  ];

  const lowStockItems = inventoryItems.filter(item => item.current_stock <= item.low_stock_alert);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">Track stock levels and manage inventory</p>
        </div>
        <Button>Update Stock</Button>
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
                    Last updated: {item.last_updated}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{item.current_stock}</div>
                  <div className="text-sm text-muted-foreground">in stock</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
