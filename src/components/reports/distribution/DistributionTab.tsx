import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { DistributionAnalytics } from '@/hooks/useDistributionAnalytics';

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

interface Props {
  analytics: DistributionAnalytics;
}

export const DistributionTab = ({ analytics }: Props) => {
  const distributionData = useMemo(() => {
    return [
      { name: 'Store', value: analytics.storeDispatched },
      { name: 'Plant', value: analytics.plantDispatched },
      { name: 'Cream Extraction', value: analytics.creamExtracted },
      { name: 'Cash Sales', value: analytics.cashSales },
      { name: 'Mixing', value: analytics.mixing },
    ].filter(item => item.value > 0);
  }, [analytics]);

  const sourceComparisonData = useMemo(() => [
    { name: 'Farm', cow: analytics.farmProduction, buffalo: 0 },
    { name: 'Collection Center', cow: 0, buffalo: analytics.collectionCenterProduction },
  ], [analytics]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Distribution Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {distributionData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Source Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sourceComparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="cow" fill="#8b5cf6" name="Cow" />
            <Bar dataKey="buffalo" fill="#3b82f6" name="Buffalo" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
