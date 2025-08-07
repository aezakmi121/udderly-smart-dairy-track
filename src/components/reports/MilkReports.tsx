
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';
import { format } from 'date-fns';

export const MilkReports = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { exportToCSV } = useReportExports();

  // Fetch monthly production data
  const { data: monthlyData } = useQuery({
    queryKey: ['milk-monthly-stats'],
    queryFn: async () => {
      const { data: productionData, error: prodError } = await supabase
        .from('milk_production')
        .select('production_date, quantity')
        .gte('production_date', format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'))
        .order('production_date');

      const { data: collectionData, error: collError } = await supabase
        .from('milk_collections')
        .select('collection_date, quantity')
        .gte('collection_date', format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'))
        .order('collection_date');

      if (prodError || collError) throw prodError || collError;

      // Group by month
      const monthlyStats = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      months.forEach((month, index) => {
        monthlyStats[month] = { month, production: 0, collection: 0 };
      });

      productionData?.forEach(record => {
        const month = months[new Date(record.production_date).getMonth()];
        monthlyStats[month].production += Number(record.quantity);
      });

      collectionData?.forEach(record => {
        const month = months[new Date(record.collection_date).getMonth()];
        monthlyStats[month].collection += Number(record.quantity);
      });

      return Object.values(monthlyStats);
    }
  });

  // Fetch current month stats
  const { data: currentStats } = useQuery({
    queryKey: ['milk-current-stats'],
    queryFn: async () => {
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      const { data: production, error: prodError } = await supabase
        .from('milk_production')
        .select('quantity, fat_percentage')
        .gte('production_date', `${currentMonth}-01`)
        .lt('production_date', format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'yyyy-MM-dd'));

      const { data: collection, error: collError } = await supabase
        .from('milk_collections')
        .select('quantity')
        .gte('collection_date', `${currentMonth}-01`)
        .lt('collection_date', format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'yyyy-MM-dd'));

      if (prodError || collError) throw prodError || collError;

      const totalProduction = production?.reduce((sum, record) => sum + Number(record.quantity), 0) || 0;
      const totalCollection = collection?.reduce((sum, record) => sum + Number(record.quantity), 0) || 0;
      const avgFat = production?.length ? 
        production.reduce((sum, record) => sum + (Number(record.fat_percentage) || 0), 0) / production.length : 0;

      return {
        totalProduction: Math.round(totalProduction),
        totalCollection: Math.round(totalCollection),
        avgFat: avgFat.toFixed(1)
      };
    }
  });

  const handleGenerateCustomReport = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }

    try {
      const { data: reportData, error } = await supabase
        .from('milk_production')
        .select(`
          *,
          cows!cow_id (cow_number)
        `)
        .gte('production_date', fromDate)
        .lte('production_date', toDate)
        .order('production_date', { ascending: false });

      if (error) throw error;

      const headers = ['production_date', 'cow_number', 'session', 'quantity', 'fat_percentage', 'snf_percentage'];
      const exportData = reportData.map(record => ({
        production_date: record.production_date,
        cow_number: record.cows?.cow_number || 'N/A',
        session: record.session,
        quantity: record.quantity,
        fat_percentage: record.fat_percentage || 0,
        snf_percentage: record.snf_percentage || 0
      }));

      exportToCSV(exportData, 'custom_milk_report', headers);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const handleExportProduction = async () => {
    try {
      const { data, error } = await supabase
        .from('milk_production')
        .select(`
          *,
          cows!cow_id (cow_number)
        `)
        .order('production_date', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const headers = ['production_date', 'cow_number', 'session', 'quantity', 'fat_percentage', 'snf_percentage'];
      const exportData = data.map(record => ({
        production_date: record.production_date,
        cow_number: record.cows?.cow_number || 'N/A',
        session: record.session,
        quantity: record.quantity,
        fat_percentage: record.fat_percentage || 0,
        snf_percentage: record.snf_percentage || 0
      }));

      exportToCSV(exportData, 'milk_production_report', headers);
    } catch (error) {
      console.error('Error exporting production data:', error);
    }
  };

  const handleExportCollection = async () => {
    try {
      const { data, error } = await supabase
        .from('milk_collections')
        .select(`
          *,
          farmers!farmer_id (name, farmer_code)
        `)
        .order('collection_date', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const headers = ['collection_date', 'farmer_name', 'farmer_code', 'session', 'quantity', 'fat_percentage', 'snf_percentage', 'rate_per_liter', 'total_amount'];
      const exportData = data.map(record => ({
        collection_date: record.collection_date,
        farmer_name: record.farmers?.name || 'N/A',
        farmer_code: record.farmers?.farmer_code || 'N/A',
        session: record.session,
        quantity: record.quantity,
        fat_percentage: record.fat_percentage,
        snf_percentage: record.snf_percentage,
        rate_per_liter: record.rate_per_liter,
        total_amount: record.total_amount
      }));

      exportToCSV(exportData, 'milk_collection_report', headers);
    } catch (error) {
      console.error('Error exporting collection data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {currentStats?.totalProduction || 0} L
            </div>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentStats?.totalCollection || 0} L
            </div>
            <p className="text-sm text-muted-foreground">From farmers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average Fat %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {currentStats?.avgFat || 0}%
            </div>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production vs Collection Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="production" fill="#3b82f6" name="Production (L)" />
                <Bar dataKey="collection" fill="#10b981" name="Collection (L)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Custom Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="from_date">From Date</Label>
              <Input 
                type="date" 
                id="from_date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to_date">To Date</Label>
              <Input 
                type="date" 
                id="to_date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerateCustomReport}>Generate Report</Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 mt-4">
            <Button variant="outline" onClick={handleExportProduction} className="text-sm">
              Export Production Data
            </Button>
            <Button variant="outline" onClick={handleExportCollection} className="text-sm">
              Export Collection Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
