import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';

interface StockDistributionItem {
  name: string;
  value: number;
  color: string;
}

interface StockData {
  totalValue: number;
  lowStockItems: number;
  stockDistribution: StockDistributionItem[];
  totalStock: number;
}

export const FeedReports = () => {
  const { exportToCSV } = useReportExports();

  // Fetch feed stock data
  const { data: stockData } = useQuery<StockData>({
    queryKey: ['feed-stock-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_items')
        .select(`
          *,
          feed_categories!category_id (name)
        `);

      if (error) throw error;

      const totalValue = data.reduce((sum, item) => 
        sum + (Number(item.current_stock) * Number(item.cost_per_unit || 0)), 0
      );

      // Fixed: Compare numeric values properly for low stock calculation
      const lowStockItems = data.filter(item => 
        Number(item.current_stock) <= Number(item.minimum_stock_level || 0)
      ).length;

      const categoryStats: Record<string, StockDistributionItem> = data.reduce((acc, item) => {
        const categoryName = item.feed_categories?.name || 'Others';
        const value = Number(item.current_stock) * Number(item.cost_per_unit || 0);
        
        if (!acc[categoryName]) {
          acc[categoryName] = { name: categoryName, value: 0, color: getRandomColor() };
        }
        acc[categoryName].value += value;
        return acc;
      }, {} as Record<string, StockDistributionItem>);

      return {
        totalValue: Math.round(totalValue),
        lowStockItems,
        stockDistribution: Object.values(categoryStats),
        totalStock: data.reduce((sum, item) => sum + Number(item.current_stock), 0)
      };
    }
  });

  // Fetch monthly consumption data
  const { data: consumptionData } = useQuery({
    queryKey: ['feed-consumption-stats'],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const { data, error } = await supabase
        .from('feed_transactions')
        .select('quantity')
        .eq('transaction_type', 'outgoing')
        .gte('transaction_date', `${currentMonth}-01`)
        .lt('transaction_date', `${currentMonth}-32`);

      if (error) throw error;

      const totalConsumption = data.reduce((sum, transaction) => 
        sum + Number(transaction.quantity), 0
      );

      return Math.round(totalConsumption);
    }
  });

  const getRandomColor = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleExportStockReport = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_items')
        .select(`
          *,
          feed_categories!category_id (name)
        `);

      if (error) throw error;

      const headers = ['name', 'category', 'current_stock', 'unit', 'cost_per_unit', 'total_value', 'minimum_stock_level'];
      const exportData = data.map(item => ({
        name: item.name,
        category: item.feed_categories?.name || 'N/A',
        current_stock: item.current_stock,
        unit: item.unit,
        cost_per_unit: item.cost_per_unit || 0,
        total_value: Number(item.current_stock) * Number(item.cost_per_unit || 0),
        minimum_stock_level: item.minimum_stock_level || 0
      }));

      exportToCSV(exportData, 'feed_stock_report', headers);
    } catch (error) {
      console.error('Error exporting stock report:', error);
    }
  };

  const handleExportTransactionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_transactions')
        .select(`
          *,
          feed_items!feed_item_id (name, unit)
        `)
        .order('transaction_date', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const headers = ['transaction_date', 'feed_item_name', 'transaction_type', 'quantity', 'unit_cost', 'total_cost', 'supplier_name'];
      const exportData = data.map(transaction => ({
        transaction_date: transaction.transaction_date,
        feed_item_name: transaction.feed_items?.name || 'N/A',
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        unit_cost: transaction.unit_cost || 0,
        total_cost: transaction.total_cost || 0,
        supplier_name: transaction.supplier_name || 'N/A'
      }));

      exportToCSV(exportData, 'feed_transaction_history', headers);
    } catch (error) {
      console.error('Error exporting transaction history:', error);
    }
  };

  const handleExportCostAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_transactions')
        .select(`
          *,
          feed_items!feed_item_id (name, unit)
        `)
        .eq('transaction_type', 'incoming')
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const headers = ['feed_item_name', 'month', 'total_quantity', 'total_cost', 'average_cost_per_unit'];
      const monthlyData: Record<string, any> = {};

      data.forEach(transaction => {
        const month = transaction.transaction_date.slice(0, 7);
        const key = `${transaction.feed_items?.name || 'N/A'}_${month}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            feed_item_name: transaction.feed_items?.name || 'N/A',
            month,
            total_quantity: 0,
            total_cost: 0,
            average_cost_per_unit: 0
          };
        }
        
        monthlyData[key].total_quantity += Number(transaction.quantity);
        monthlyData[key].total_cost += Number(transaction.total_cost || 0);
      });

      Object.values(monthlyData).forEach((item: any) => {
        item.average_cost_per_unit = item.total_quantity > 0 ? 
          (item.total_cost / item.total_quantity).toFixed(2) : 0;
      });

      exportToCSV(Object.values(monthlyData), 'feed_cost_analysis', headers);
    } catch (error) {
      console.error('Error exporting cost analysis:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{stockData?.totalValue?.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-muted-foreground">Current inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {consumptionData || 0} kg
            </div>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stockData?.lowStockItems || 0}
            </div>
            <p className="text-sm text-muted-foreground">Need reorder</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockData?.stockDistribution || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name} (₹${value.toLocaleString()})`}
                >
                  {(stockData?.stockDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <Button variant="outline" onClick={handleExportStockReport} className="text-sm">
              Export Stock Report
            </Button>
            <Button variant="outline" onClick={handleExportTransactionHistory} className="text-sm">
              Export Transaction History
            </Button>
            <Button variant="outline" onClick={handleExportCostAnalysis} className="text-sm">
              Export Cost Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
