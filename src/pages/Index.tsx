
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Beef, Milk, Users, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  // Fetch dashboard statistics - using same query key as cows section for cache sharing
  const { data: cowsCount } = useQuery({
    queryKey: ['cows-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cows')
        .select('*')
        .eq('status', 'active');
      return data?.length || 0;
    }
  });

  const { data: milkingCowsCount } = useQuery({
    queryKey: ['milking-cows-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('cows')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('last_calving_date', 'is', null);
      return count || 0;
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

  const { data: todaysMilk } = useQuery({
    queryKey: ['todays-milk'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('milk_production')
        .select('quantity')
        .eq('production_date', today);
      
      return data?.reduce((sum, record) => sum + Number(record.quantity), 0) || 0;
    }
  });

  const { data: monthlyMilk } = useQuery({
    queryKey: ['monthly-milk'],
    queryFn: async () => {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const { data } = await supabase
        .from('milk_production')
        .select('quantity')
        .gte('production_date', firstDay);
      
      return data?.reduce((sum, record) => sum + Number(record.quantity), 0) || 0;
    }
  });

  const { data: upcomingAI } = useQuery({
    queryKey: ['upcoming-ai'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ai_records')
        .select('*', { count: 'exact', head: true })
        .eq('ai_status', 'pending');
      return count || 0;
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dairy Farm Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your dairy management system. Here's an overview of your farm operations.
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Cows</CardTitle>
            <Beef className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cowsCount}</div>
            <p className="text-xs text-muted-foreground">
              {milkingCowsCount} currently milking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Milk</CardTitle>
            <Milk className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysMilk?.toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              Fresh milk collected today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyMilk?.toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              Milk production this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Farmers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farmersCount}</div>
            <p className="text-xs text-muted-foreground">
              Registered milk suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Activities
            </CardTitle>
            <CardDescription>
              Scheduled farm activities and reminders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAI > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Pending AI Services</p>
                    <p className="text-sm text-muted-foreground">{upcomingAI} cows pending</p>
                  </div>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">Vaccination Due</p>
                  <p className="text-sm text-muted-foreground">Check vaccination schedules</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your dairy operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Morning milk collection completed</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">New farmer registration</p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Feed inventory updated</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
