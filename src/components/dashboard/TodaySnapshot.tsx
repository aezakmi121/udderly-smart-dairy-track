import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Milk, Factory, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  emptyCollectionDay,
  emptyProductionDay,
  type DashboardOverview,
} from '@/hooks/useDashboardOverview';

const Delta: React.FC<{ today: number; yesterday: number; unit?: string }> = ({
  today,
  yesterday,
  unit = '',
}) => {
  const diff = today - yesterday;
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> same as yesterday
      </span>
    );
  }
  const up = diff > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const pct = yesterday > 0 ? Math.round((diff / yesterday) * 100) : null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        up ? 'text-green-600' : 'text-red-600'
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}
      {diff.toFixed(1)}
      {unit}
      {pct !== null ? ` (${up ? '+' : ''}${pct}%)` : ''}
      <span className="font-normal text-muted-foreground">vs yesterday</span>
    </span>
  );
};

interface Props {
  overview?: DashboardOverview;
  isLoading: boolean;
  showCollection: boolean;
  showProduction: boolean;
}

export const TodaySnapshot: React.FC<Props> = ({
  overview,
  isLoading,
  showCollection,
  showProduction,
}) => {
  const c = overview?.collection.today ?? emptyCollectionDay();
  const cY = overview?.collection.yesterday ?? emptyCollectionDay();
  const p = overview?.production.today ?? emptyProductionDay();
  const pY = overview?.production.yesterday ?? emptyProductionDay();

  return (
    <div
      className={`grid grid-cols-1 gap-4 ${
        showCollection && showProduction ? 'lg:grid-cols-2' : ''
      }`}
    >
      {showCollection && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Milk className="h-4 w-4 text-green-600" /> Collection — Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">
                {isLoading ? '…' : `${c.qty.toFixed(1)} L`}
              </span>
              <span className="text-lg font-semibold text-muted-foreground">
                ₹{c.amount.toFixed(0)}
              </span>
            </div>
            {!isLoading && <Delta today={c.qty} yesterday={cY.qty} unit=" L" />}
            <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
              <div className="rounded bg-muted/50 px-2 py-1">
                Morning <span className="font-semibold">{c.morning.qty.toFixed(1)} L</span>
                <span className="text-muted-foreground"> · {c.morning.count}</span>
              </div>
              <div className="rounded bg-muted/50 px-2 py-1">
                Evening <span className="font-semibold">{c.evening.qty.toFixed(1)} L</span>
                <span className="text-muted-foreground"> · {c.evening.count}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              <span>{c.farmers} farmers</span>
              <span>Avg Fat {c.avgFat.toFixed(1)}%</span>
              <span>Avg SNF {c.avgSnf.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {showProduction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Factory className="h-4 w-4 text-blue-600" /> Production — Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">
              {isLoading ? '…' : `${p.qty.toFixed(1)} L`}
            </div>
            {!isLoading && <Delta today={p.qty} yesterday={pY.qty} unit=" L" />}
            <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
              <div className="rounded bg-muted/50 px-2 py-1">
                Morning <span className="font-semibold">{p.morning.toFixed(1)} L</span>
              </div>
              <div className="rounded bg-muted/50 px-2 py-1">
                Evening <span className="font-semibold">{p.evening.toFixed(1)} L</span>
              </div>
            </div>
            <div className="pt-1 text-xs text-muted-foreground">
              {p.records} cow {p.records === 1 ? 'entry' : 'entries'} logged
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
