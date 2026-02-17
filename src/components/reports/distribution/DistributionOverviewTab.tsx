import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DistributionAnalytics } from '@/hooks/useDistributionAnalytics';

interface Props {
  analytics: DistributionAnalytics;
}

export const DistributionOverviewTab = ({ analytics }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Total Production</p>
          <p className="text-3xl font-bold">{analytics.totalProduction.toFixed(1)} L</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Farm: {analytics.farmProduction.toFixed(1)} L</span>
            <span className="text-muted-foreground">CC: {analytics.collectionCenterProduction.toFixed(1)} L</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Store Dispatch vs Receipt</p>
          <p className="text-3xl font-bold">
            {analytics.storeDispatched.toFixed(1)} L → {analytics.storeReceived.toFixed(1)} L
          </p>
          <div className="flex items-center gap-2">
            {Math.abs(analytics.storeDiscrepancy) < 2 ? (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-600">Discrepancy: {analytics.storeDiscrepancy.toFixed(1)} L (OK)</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">Discrepancy: {analytics.storeDiscrepancy.toFixed(1)} L</span>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Plant Dispatch + Revenue</p>
          <p className="text-3xl font-bold">{analytics.plantDispatched.toFixed(1)} L</p>
          <p className="text-lg text-muted-foreground">Revenue: ₹{analytics.plantRevenue.toLocaleString('en-IN')}</p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Cream + FFM</p>
          <p className="text-3xl font-bold">{analytics.creamExtracted.toFixed(1)} L</p>
          <p className="text-lg text-muted-foreground">FFM: {analytics.ffmGenerated.toFixed(1)} L</p>
        </div>
      </Card>
    </div>
  );
};
