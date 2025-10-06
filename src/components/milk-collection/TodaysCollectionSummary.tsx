import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionTotals {
  quantity: number;
  amount: number;
  count: number;
  avgRate: number;
}

interface DailyStatsShape {
  morning?: Partial<SessionTotals>;
  evening?: Partial<SessionTotals>;
  total?: Partial<SessionTotals>;
}

interface CollectionRow {
  id: string;
  collection_date: string; // "YYYY-MM-DD"
  session: "morning" | "evening";
  quantity: number | string;
  total_amount: number | string;
  rate_per_liter?: number | string;
  fat_percentage?: number | string;
  snf_percentage?: number | string;
  farmers?: { name?: string; farmer_code?: string };
}

interface TodaysCollectionSummaryProps {
  collections: CollectionRow[];
  dailyStats?: DailyStatsShape;
  selectedDate: string; // "YYYY-MM-DD"
  isLoading: boolean;
}

export const TodaysCollectionSummary: React.FC<TodaysCollectionSummaryProps> = ({
  collections,
  dailyStats,
  selectedDate,
  isLoading,
}) => {
  // Skeleton for loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="h-24 animate-pulse" /></Card>
        <Card><CardContent className="h-24 animate-pulse" /></Card>
        <Card><CardContent className="h-24 animate-pulse" /></Card>
      </div>
    );
  }

  // Helper: coerce number
  const N = (v: any) => (v == null || v === "" || isNaN(Number(v)) ? 0 : Number(v));

  // If dailyStats provided, prefer it; else compute from collections (for the selected date)
  let morning: SessionTotals = { quantity: 0, amount: 0, count: 0, avgRate: 0 };
  let evening: SessionTotals = { quantity: 0, amount: 0, count: 0, avgRate: 0 };
  let total: SessionTotals   = { quantity: 0, amount: 0, count: 0, avgRate: 0 };

  if (dailyStats) {
    morning.quantity = N(dailyStats.morning?.quantity);
    morning.amount   = N(dailyStats.morning?.amount);
    morning.count    = N(dailyStats.morning?.count);
    morning.avgRate  = morning.quantity > 0 ? morning.amount / morning.quantity : 0;

    evening.quantity = N(dailyStats.evening?.quantity);
    evening.amount   = N(dailyStats.evening?.amount);
    evening.count    = N(dailyStats.evening?.count);
    evening.avgRate  = evening.quantity > 0 ? evening.amount / evening.quantity : 0;

    total.quantity   = N(dailyStats.total?.quantity);
    total.amount     = N(dailyStats.total?.amount);
    total.count      = N(dailyStats.total?.count);
    total.avgRate    = total.quantity > 0 ? total.amount / total.quantity : 0;
  } else {
    const rowsForDate = (collections || []).filter(
      (c) => c.collection_date === selectedDate
    );
    const m = rowsForDate.filter((c) => c.session === "morning");
    const e = rowsForDate.filter((c) => c.session === "evening");

    morning.quantity = m.reduce((s, r) => s + N(r.quantity), 0);
    morning.amount   = m.reduce((s, r) => s + N(r.total_amount), 0);
    morning.count    = m.length;
    morning.avgRate  = morning.quantity > 0 ? morning.amount / morning.quantity : 0;

    evening.quantity = e.reduce((s, r) => s + N(r.quantity), 0);
    evening.amount   = e.reduce((s, r) => s + N(r.total_amount), 0);
    evening.count    = e.length;
    evening.avgRate  = evening.quantity > 0 ? evening.amount / evening.quantity : 0;

    total.quantity   = morning.quantity + evening.quantity;
    total.amount     = morning.amount + evening.amount;
    total.count      = rowsForDate.length;
    total.avgRate    = total.quantity > 0 ? total.amount / total.quantity : 0;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Morning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-2xl font-bold">{morning.quantity.toFixed(1)} L</div>
          <div className="text-sm font-semibold">₹{morning.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            Avg Rate: ₹{morning.avgRate.toFixed(2)}/L • {morning.count} entries
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Evening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-2xl font-bold">{evening.quantity.toFixed(1)} L</div>
          <div className="text-sm font-semibold">₹{evening.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            Avg Rate: ₹{evening.avgRate.toFixed(2)}/L • {evening.count} entries
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-2xl font-bold">{total.quantity.toFixed(1)} L</div>
          <div className="text-sm font-semibold">₹{total.amount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            Avg Rate: ₹{total.avgRate.toFixed(2)}/L • {total.count} entries
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
