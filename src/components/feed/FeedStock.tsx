
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedStock = () => {
  const { feedItems, isLoading } = useFeedManagement();

  if (isLoading) {
    return <div className="text-center py-4">Loading stock information...</div>;
  }

  const lowStockItems = feedItems?.filter(item => 
    item.current_stock <= item.minimum_stock_level
  ) || [];

  return (
    <div className="space-y-6">
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="destructive">
                    {item.current_stock} {item.unit} (Min: {item.minimum_stock_level})
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feedItems?.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {item.feed_categories?.name}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Current Stock:</span>
                  <span className="font-semibold">
                    {item.current_stock} {item.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Min Level:</span>
                  <span>{item.minimum_stock_level} {item.unit}</span>
                </div>
                {item.cost_per_unit && (
                  <div className="flex justify-between">
                    <span>Cost per {item.unit}:</span>
                    <span>₹{item.cost_per_unit}</span>
                  </div>
                )}
                <Badge 
                  variant={item.current_stock > item.minimum_stock_level ? "default" : "destructive"}
                  className="w-full justify-center"
                >
                  {item.current_stock > item.minimum_stock_level ? "In Stock" : "Low Stock"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
