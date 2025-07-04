
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Milk } from 'lucide-react';

interface MilkStatsCardsProps {
  dailyStats: {
    morning: number;
    evening: number;
    total: number;
    records: number;
  } | undefined;
}

export const MilkStatsCards: React.FC<MilkStatsCardsProps> = ({ dailyStats }) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Morning Milk</CardTitle>
          <Milk className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dailyStats?.morning?.toFixed(1) || '0.0'} L</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Evening Milk</CardTitle>
          <Milk className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dailyStats?.evening?.toFixed(1) || '0.0'} L</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Daily</CardTitle>
          <Milk className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dailyStats?.total?.toFixed(1) || '0.0'} L</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Records</CardTitle>
          <Milk className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dailyStats?.records || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
};
