
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Beef, Baby, Milk, Users, TrendingUp, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

export const Dashboard = () => {
  const { canAccess } = useUserPermissions();

  // Query for dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const results = await Promise.allSettled([
        canAccess.cows ? supabase.from('cows').select('*', { count: 'exact' }) : Promise.resolve({ count: 0 }),
        canAccess.calves ? supabase.from('calves').select('*', { count: 'exact' }) : Promise.resolve({ count: 0 }),
        canAccess.milkProduction ? supabase
          .from('milk_production')
          .select('quantity')
          .gte('production_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) : Promise.resolve({ data: [] }),
        canAccess.farmers ? supabase.from('farmers').select('*', { count: 'exact' }) : Promise.resolve({ count: 0 }),
      ]);

      return {
        totalCows: results[0].status === 'fulfilled' ? results[0].value.count || 0 : 0,
        totalCalves: results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0,
        monthlyMilk: results[2].status === 'fulfilled' && results[2].value.data 
          ? results[2].value.data.reduce((sum: number, record: { quantity: number }) => sum + (record.quantity || 0), 0)
          : 0,
        totalFarmers: results[3].status === 'fulfilled' ? results[3].value.count || 0 : 0,
      };
    },
  });

  
  const statsCards = [
    {
      title: 'Total Cows',
      value: stats?.totalCows || 0,
      icon: Beef,
      color: 'text-blue-600',
      show: canAccess.cows
    },
    {
      title: 'Total Calves',
      value: stats?.totalCalves || 0,
      icon: Baby,
      color: 'text-pink-600',
      show: canAccess.calves
    },
    {
      title: 'Monthly Milk (L)',
      value: stats?.monthlyMilk?.toFixed(1) || '0',
      icon: Milk,
      color: 'text-green-600',
      show: canAccess.milkProduction
    },
    {
      title: 'Total Farmers',
      value: stats?.totalFarmers || 0,
      icon: Users,
      color: 'text-purple-600',
      show: canAccess.farmers
    },
  ].filter(card => card.show);

  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notifications Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NotificationPanel />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use the sidebar to navigate to different sections of the farm management system.
              </p>
              <div className="text-xs text-muted-foreground">
                Access is based on your assigned role and permissions.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
