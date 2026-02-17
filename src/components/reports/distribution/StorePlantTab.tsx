import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DistributionAnalytics } from '@/hooks/useDistributionAnalytics';

interface Props {
  analytics: DistributionAnalytics;
}

export const StorePlantTab = ({ analytics }: Props) => {
  return (
    <div className="space-y-6">
      {/* Store Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Store Analysis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Dispatched</p>
            <p className="text-2xl font-bold">{analytics.storeDispatched.toFixed(1)} L</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Received</p>
            <p className="text-2xl font-bold">{analytics.storeReceived.toFixed(1)} L</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Discrepancy</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{analytics.storeDiscrepancy.toFixed(1)} L</p>
              {Math.abs(analytics.storeDiscrepancy) < 2 ? (
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Plant Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Plant Sales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Quantity Dispatched</p>
            <p className="text-2xl font-bold">{analytics.plantDispatched.toFixed(1)} L</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">₹{analytics.plantRevenue.toLocaleString('en-IN')}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Avg Rate</p>
            <p className="text-2xl font-bold">
              {analytics.plantDispatched > 0
                ? `₹${(analytics.plantRevenue / analytics.plantDispatched).toFixed(2)}/L`
                : '—'}
            </p>
          </Card>
        </div>
      </div>

      {/* Other distributions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Other</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Cash Sales</p>
            <p className="text-2xl font-bold">{analytics.cashSales.toFixed(1)} L</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Mixing</p>
            <p className="text-2xl font-bold">{analytics.mixing.toFixed(1)} L</p>
          </Card>
        </div>
      </div>
    </div>
  );
};
