
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';

export const CattleReports = () => {
  const { exportToCSV } = useReportExports();

  // Fetch cattle statistics
  const { data: cattleStats } = useQuery({
    queryKey: ['cattle-stats'],
    queryFn: async () => {
      const { data: cows, error: cowError } = await supabase
        .from('cows')
        .select('status');

      const { data: calves, error: calfError } = await supabase
        .from('calves')
        .select('status');

      if (cowError || calfError) throw cowError || calfError;

      const activeCows = cows?.filter(cow => cow.status === 'active').length || 0;
      const milkingCows = cows?.filter(cow => cow.status === 'active').length || 0; // Simplified
      const pregnantCows = cows?.filter(cow => cow.status === 'pregnant').length || 0;
      const totalCalves = calves?.filter(calf => calf.status === 'alive').length || 0;

      return {
        totalCattle: cows?.length || 0,
        activeCows,
        milkingCows,
        pregnantCows,
        totalCalves
      };
    }
  });

  // Fetch weight trend data
  const { data: weightData } = useQuery({
    queryKey: ['weight-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('log_date, calculated_weight')
        .gte('log_date', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('log_date');

      if (error) throw error;

      // Group by month and calculate average
      const monthlyWeights = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

      months.forEach(month => {
        monthlyWeights[month] = { month, avgWeight: 0, count: 0 };
      });

      data?.forEach(record => {
        const monthIndex = new Date(record.log_date).getMonth();
        const month = months[monthIndex % 6];
        if (monthlyWeights[month]) {
          monthlyWeights[month].avgWeight += Number(record.calculated_weight);
          monthlyWeights[month].count += 1;
        }
      });

      Object.values(monthlyWeights).forEach((item: any) => {
        if (item.count > 0) {
          item.avgWeight = Math.round(item.avgWeight / item.count);
        } else {
          item.avgWeight = 0;
        }
      });

      return Object.values(monthlyWeights);
    }
  });

  // Fetch vaccination status
  const { data: vaccinationStats } = useQuery({
    queryKey: ['vaccination-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vaccination_records')
        .select('next_due_date')
        .order('next_due_date');

      if (error) throw error;

      const today = new Date();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const upToDate = data?.filter(record => 
        new Date(record.next_due_date) > thirtyDaysFromNow
      ).length || 0;

      const dueSoon = data?.filter(record => {
        const dueDate = new Date(record.next_due_date);
        return dueDate <= thirtyDaysFromNow && dueDate >= today;
      }).length || 0;

      const overdue = data?.filter(record => 
        new Date(record.next_due_date) < today
      ).length || 0;

      return { upToDate, dueSoon, overdue };
    }
  });

  const handleExportCattleData = async () => {
    try {
      const { data, error } = await supabase
        .from('cows')
        .select('*');

      if (error) throw error;

      const headers = ['cow_number', 'breed', 'status', 'date_of_birth', 'last_calving_date', 'lactation_number', 'lifetime_yield', 'current_month_yield'];
      const exportData = data.map(cow => ({
        cow_number: cow.cow_number,
        breed: cow.breed || 'N/A',
        status: cow.status,
        date_of_birth: cow.date_of_birth || 'N/A',
        last_calving_date: cow.last_calving_date || 'N/A',
        lactation_number: cow.lactation_number || 0,
        lifetime_yield: cow.lifetime_yield || 0,
        current_month_yield: cow.current_month_yield || 0
      }));

      exportToCSV(exportData, 'cattle_data_report', headers);
    } catch (error) {
      console.error('Error exporting cattle data:', error);
    }
  };

  const handleGenerateVaccinationSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccination_records')
        .select(`
          *,
          cows!cow_id (cow_number),
          vaccination_schedules!vaccination_schedule_id (vaccine_name)
        `)
        .order('next_due_date');

      if (error) throw error;

      const headers = ['cow_number', 'vaccine_name', 'last_vaccination_date', 'next_due_date', 'status'];
      const today = new Date();
      
      const exportData = data.map(record => {
        const dueDate = new Date(record.next_due_date);
        let status = 'Up to date';
        if (dueDate < today) status = 'Overdue';
        else if (dueDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) status = 'Due soon';

        return {
          cow_number: record.cows?.cow_number || 'N/A',
          vaccine_name: record.vaccination_schedules?.vaccine_name || 'N/A',
          last_vaccination_date: record.vaccination_date,
          next_due_date: record.next_due_date,
          status
        };
      });

      exportToCSV(exportData, 'vaccination_schedule', headers);
    } catch (error) {
      console.error('Error generating vaccination schedule:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Cattle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {cattleStats?.totalCattle || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active cattle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Milking Cows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {cattleStats?.milkingCows || 0}
            </div>
            <p className="text-sm text-muted-foreground">Currently milking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pregnant Cows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {cattleStats?.pregnantCows || 0}
            </div>
            <p className="text-sm text-muted-foreground">Expecting calves</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Calves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {cattleStats?.totalCalves || 0}
            </div>
            <p className="text-sm text-muted-foreground">Young calves</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avgWeight" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Average Weight (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health & Vaccination Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {vaccinationStats?.upToDate || 0}
              </div>
              <p className="text-sm text-muted-foreground">Up to date</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {vaccinationStats?.dueSoon || 0}
              </div>
              <p className="text-sm text-muted-foreground">Due soon</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {vaccinationStats?.overdue || 0}
              </div>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <Button onClick={handleGenerateVaccinationSchedule} className="text-sm">
              Generate Vaccination Schedule
            </Button>
            <Button variant="outline" onClick={handleExportCattleData} className="text-sm">
              Export Cattle Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
