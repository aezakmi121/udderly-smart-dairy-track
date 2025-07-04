import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Beef, Milk, Users, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const Dashboard = () => {
  const { data: cowsCount } = useQuery({
    queryKey: ['cows-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('cows')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: todayMilk } = useQuery({
    queryKey: ['today-milk'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('milk_production')
        .select('quantity')
        .eq('production_date', today);
      
      return data?.reduce((sum, record) => sum + Number(record.quantity), 0) || 0;
    }
  });

  const { data: farmersCount } = useQuery({
    queryKey: ['farmers-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    }
  });

  const { data: calvesCount } = useQuery({
    queryKey: ['calves-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('calves')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'alive');
      return count || 0;
    }
  });

  const stats = [
    {
      title: "Total Cows",
      value: cowsCount?.toString() || "0",
      description: "Active cows in the farm",
      icon: Beef,
      color: "text-blue-600"
    },
    {
      title: "Today's Milk",
      value: `${todayMilk?.toFixed(1) || "0"} L`,
      description: "Total milk production today",
      icon: Milk,
      color: "text-green-600"
    },
    {
      title: "Active Farmers",
      value: farmersCount?.toString() || "0",
      description: "Registered milk suppliers",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Live Calves",
      value: calvesCount?.toString() || "0",
      description: "Healthy calves in the farm",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your dairy farm management system
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your dairy farm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Milk production recorded</p>
                  <p className="text-xs text-muted-foreground">Morning session completed</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New calf registered</p>
                  <p className="text-xs text-muted-foreground">Female calf from Cow #145</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Vaccination due</p>
                  <p className="text-xs text-muted-foreground">3 cows need deworming</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Farm performance overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Avg. Daily Milk</span>
                <span className="font-medium">245.5 L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pregnancy Rate</span>
                <span className="font-medium">78%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Feed Efficiency</span>
                <span className="font-medium">92%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Health Score</span>
                <span className="font-medium">95%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
