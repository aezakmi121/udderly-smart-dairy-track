import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { ProductionBreakdown } from '@/hooks/useDistributionAnalytics';

interface Props {
  breakdown: ProductionBreakdown;
}

export const ProductionBreakdownTab = ({ breakdown }: Props) => {
  const chartData = useMemo(() => {
    return breakdown.dailyBreakdown.map(d => ({
      date: format(new Date(d.date), 'dd MMM'),
      Morning: d.morning,
      Evening: d.evening,
    }));
  }, [breakdown.dailyBreakdown]);

  const topProducers = breakdown.byCow.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Session Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Morning</p>
          <p className="text-2xl font-bold">{breakdown.bySession.morning.toFixed(1)} L</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Evening</p>
          <p className="text-2xl font-bold">{breakdown.bySession.evening.toFixed(1)} L</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{(breakdown.bySession.morning + breakdown.bySession.evening).toFixed(1)} L</p>
        </Card>
      </div>

      {/* Daily Production Chart */}
      {chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Production (Morning/Evening)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Morning" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="Evening" stackId="a" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top Producers */}
      {topProducers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Producers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {topProducers.map((cow, i) => (
              <Card key={cow.cowNumber} className="p-3 text-center border-2">
                <p className="text-xs text-muted-foreground">#{i + 1}</p>
                <p className="font-bold text-lg">{cow.cowNumber}</p>
                <p className="text-sm text-muted-foreground">{cow.total.toFixed(1)} L</p>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Per-Cow Table */}
      {breakdown.byCow.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Per-Cow Breakdown</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cow #</TableHead>
                  <TableHead className="text-right">Morning (L)</TableHead>
                  <TableHead className="text-right">Evening (L)</TableHead>
                  <TableHead className="text-right">Total (L)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.byCow.map((cow) => (
                  <TableRow key={cow.cowNumber}>
                    <TableCell className="font-medium">{cow.cowNumber}</TableCell>
                    <TableCell className="text-right">{cow.morning.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{cow.evening.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-semibold">{cow.total.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};
