import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendPoint } from '@/hooks/useDashboardOverview';

interface Props {
  data: TrendPoint[];
  showCollection: boolean;
  showProduction: boolean;
}

export const WeeklyTrendChart: React.FC<Props> = ({ data, showCollection, showProduction }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">Last 7 Days (litres)</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            formatter={(value: number, name: string) => [`${Number(value).toFixed(1)} L`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {showCollection && (
            <Bar dataKey="collectionQty" name="Collection" fill="#16a34a" radius={[4, 4, 0, 0]} />
          )}
          {showProduction && (
            <Bar dataKey="productionQty" name="Production" fill="#2563eb" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);
