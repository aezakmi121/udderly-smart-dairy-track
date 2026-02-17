import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DistributionAnalytics } from '@/hooks/useDistributionAnalytics';

interface Props {
  analytics: DistributionAnalytics;
}

export const CreamFFMTab = ({ analytics }: Props) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Cream Extracted</p>
          <p className="text-2xl font-bold">{analytics.creamExtracted.toFixed(1)} L</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">FFM Generated</p>
          <p className="text-2xl font-bold">{analytics.ffmGenerated.toFixed(1)} L</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Extraction Ratio</p>
          <p className="text-2xl font-bold">
            {analytics.creamExtracted > 0 && analytics.ffmGenerated > 0
              ? `${((analytics.creamExtracted / (analytics.creamExtracted + analytics.ffmGenerated)) * 100).toFixed(1)}%`
              : '—'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Processed</p>
          <p className="text-2xl font-bold">{(analytics.creamExtracted + analytics.ffmGenerated).toFixed(1)} L</p>
        </Card>
      </div>

      {/* Monthly Trends */}
      {analytics.monthlyTrends.length > 1 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="production" stroke="#8b5cf6" name="Production" />
              <Line type="monotone" dataKey="storeDispatched" stroke="#3b82f6" name="Store" />
              <Line type="monotone" dataKey="plantDispatched" stroke="#10b981" name="Plant" />
              <Line type="monotone" dataKey="creamExtracted" stroke="#f59e0b" name="Cream" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};
