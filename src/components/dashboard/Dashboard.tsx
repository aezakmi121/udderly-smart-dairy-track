import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Beef, Baby, Users, Wallet, Calendar } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { CowActionSummaryCard } from './CowActionSummaryCard';
import { TodaySnapshot } from './TodaySnapshot';
import { WeeklyTrendChart } from './WeeklyTrendChart';
import { formatDate } from '@/lib/dateUtils';

export const Dashboard = () => {
  const { canEdit } = useUserPermissions();
  const { data: overview, isLoading } = useDashboardOverview();

  const showCollection = canEdit.milkCollection;
  const showProduction = canEdit.milkProduction;

  const refStats = [
    canEdit.cows && { label: 'Cows', value: overview?.counts.cows ?? 0, icon: Beef },
    canEdit.calves && { label: 'Calves', value: overview?.counts.calves ?? 0, icon: Baby },
    canEdit.farmers && { label: 'Farmers', value: overview?.counts.farmers ?? 0, icon: Users },
    showCollection && {
      label: '7-day collection',
      value: `₹${(overview?.weekCollectionValue ?? 0).toFixed(0)}`,
      icon: Wallet,
    },
  ].filter(Boolean) as Array<{
    label: string;
    value: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {formatDate(new Date())}
        </div>
      </div>

      {/* Cows that need attention */}
      {canEdit.cows && <CowActionSummaryCard />}

      {/* Today's milk operations vs yesterday */}
      {(showCollection || showProduction) && (
        <TodaySnapshot
          overview={overview}
          isLoading={isLoading}
          showCollection={showCollection}
          showProduction={showProduction}
        />
      )}

      {/* 7-day trend */}
      {(showCollection || showProduction) && overview && (
        <WeeklyTrendChart
          data={overview.trend}
          showCollection={showCollection}
          showProduction={showProduction}
        />
      )}

      {/* Reference counts */}
      {refStats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {refStats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-bold leading-none">
                      {isLoading ? '…' : s.value}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Alerts */}
      <NotificationPanel />
    </div>
  );
};
