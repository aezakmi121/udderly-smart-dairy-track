import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';
import { format, subDays } from 'date-fns';
import { Droplets, TrendingUp, Target, Zap } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4'];

export const MilkProductionReports = () => {
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { exportToCSV } = useReportExports();

  // Fetch production analytics for selected date range
  const { data: productionAnalytics, isLoading } = useQuery({
    queryKey: ['milk-production-analytics', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_production')
        .select(`
          *,
          cows!cow_id (cow_number, lactation_number, days_in_milk: calculate_days_in_milk(id))
        `)
        .gte('production_date', fromDate)
        .lte('production_date', toDate)
        .order('production_date', { ascending: true });

      if (error) throw error;

      // Calculate analytics
      const totalProduction = data.reduce((sum, record) => sum + Number(record.quantity), 0);
      const totalRecords = data.length;
      const avgProduction = totalProduction / totalRecords || 0;
      const avgFat = data.length > 0 ? data.reduce((sum, record) => sum + (Number(record.fat_percentage) || 0), 0) / data.length : 0;
      const avgSNF = data.length > 0 ? data.reduce((sum, record) => sum + (Number(record.snf_percentage) || 0), 0) / data.length : 0;

      // Session breakdown
      const morningData = data.filter(record => record.session === 'morning');
      const eveningData = data.filter(record => record.session === 'evening');

      // Daily trends
      const dailyTrends = data.reduce((acc, record) => {
        const date = record.production_date;
        if (!acc[date]) {
          acc[date] = { date, quantity: 0, records: 0, fat: 0, snf: 0 };
        }
        acc[date].quantity += Number(record.quantity);
        acc[date].records += 1;
        acc[date].fat += Number(record.fat_percentage) || 0;
        acc[date].snf += Number(record.snf_percentage) || 0;
        return acc;
      }, {} as Record<string, any>);

      // Process daily trends with averages
      const processedDailyTrends = Object.values(dailyTrends).map(trend => ({
        ...trend,
        quantity: Math.round(trend.quantity * 100) / 100,
        avgFat: trend.records > 0 ? Math.round((trend.fat / trend.records) * 100) / 100 : 0,
        avgSNF: trend.records > 0 ? Math.round((trend.snf / trend.records) * 100) / 100 : 0
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Cow performance analysis
      const cowPerformance = data.reduce((acc, record) => {
        const cowId = record.cow_id;
        const cowNumber = record.cows?.cow_number || `Unknown-${cowId}`;
        
        if (!acc[cowId]) {
          acc[cowId] = {
            cowNumber,
            totalQuantity: 0,
            records: 0,
            avgQuantity: 0,
            fatSum: 0,
            snfSum: 0,
            avgFat: 0,
            avgSNF: 0,
            lactationNumber: record.cows?.lactation_number || 1,
            daysInMilk: record.cows?.days_in_milk || 0
          };
        }
        
        acc[cowId].totalQuantity += Number(record.quantity);
        acc[cowId].records += 1;
        acc[cowId].fatSum += Number(record.fat_percentage) || 0;
        acc[cowId].snfSum += Number(record.snf_percentage) || 0;
        
        return acc;
      }, {} as Record<string, any>);

      // Calculate averages for cow performance
      const topPerformers = Object.values(cowPerformance).map(cow => ({
        ...cow,
        totalQuantity: Math.round(cow.totalQuantity * 100) / 100,
        avgQuantity: Math.round((cow.totalQuantity / cow.records) * 100) / 100,
        avgFat: cow.records > 0 ? Math.round((cow.fatSum / cow.records) * 100) / 100 : 0,
        avgSNF: cow.records > 0 ? Math.round((cow.snfSum / cow.records) * 100) / 100 : 0
      })).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);

      // Lactation analysis
      const lactationAnalysis = data.reduce((acc, record) => {
        const lactation = record.cows?.lactation_number || 1;
        if (!acc[lactation]) {
          acc[lactation] = { lactation: `Lactation ${lactation}`, quantity: 0, records: 0 };
        }
        acc[lactation].quantity += Number(record.quantity);
        acc[lactation].records += 1;
        return acc;
      }, {} as Record<string, any>);

      const lactationData = Object.values(lactationAnalysis).map(item => ({
        ...item,
        quantity: Math.round(item.quantity * 100) / 100,
        avgPerRecord: Math.round((item.quantity / item.records) * 100) / 100
      })).sort((a, b) => a.lactation.localeCompare(b.lactation));

      return {
        totalProduction: Math.round(totalProduction * 100) / 100,
        totalRecords,
        avgProduction: Math.round(avgProduction * 100) / 100,
        avgFat: Math.round(avgFat * 100) / 100,
        avgSNF: Math.round(avgSNF * 100) / 100,
        sessionBreakdown: [
          { 
            name: 'Morning', 
            quantity: Math.round(morningData.reduce((sum, record) => sum + Number(record.quantity), 0) * 100) / 100, 
            records: morningData.length,
            avgPerRecord: morningData.length > 0 ? Math.round((morningData.reduce((sum, record) => sum + Number(record.quantity), 0) / morningData.length) * 100) / 100 : 0
          },
          { 
            name: 'Evening', 
            quantity: Math.round(eveningData.reduce((sum, record) => sum + Number(record.quantity), 0) * 100) / 100, 
            records: eveningData.length,
            avgPerRecord: eveningData.length > 0 ? Math.round((eveningData.reduce((sum, record) => sum + Number(record.quantity), 0) / eveningData.length) * 100) / 100 : 0
          }
        ],
        dailyTrends: processedDailyTrends,
        topPerformers,
        lactationData,
        uniqueCows: Object.keys(cowPerformance).length,
        rawData: data
      };
    },
    enabled: !!fromDate && !!toDate
  });

  const handleExportReport = async () => {
    if (!productionAnalytics?.rawData) return;

    const headers = [
      'production_date', 
      'cow_number', 
      'session', 
      'quantity', 
      'fat_percentage', 
      'snf_percentage',
      'lactation_number',
      'days_in_milk',
      'remarks'
    ];
    
    const exportData = productionAnalytics.rawData.map(record => ({
      production_date: record.production_date,
      cow_number: record.cows?.cow_number || 'N/A',
      session: record.session,
      quantity: Math.round(Number(record.quantity) * 100) / 100,
      fat_percentage: record.fat_percentage ? Math.round(Number(record.fat_percentage) * 100) / 100 : '',
      snf_percentage: record.snf_percentage ? Math.round(Number(record.snf_percentage) * 100) / 100 : '',
      lactation_number: record.cows?.lactation_number || '',
      days_in_milk: record.cows?.days_in_milk || '',
      remarks: record.remarks || ''
    }));

    exportToCSV(exportData, 'milk_production_comprehensive_report', headers);
  };

  const handleExportCowPerformance = () => {
    if (!productionAnalytics?.topPerformers) return;

    const headers = ['cow_number', 'total_quantity', 'avg_quantity_per_session', 'total_sessions', 'avg_fat_percentage', 'avg_snf_percentage', 'lactation_number', 'days_in_milk'];
    
    const exportData = productionAnalytics.topPerformers.map(cow => ({
      cow_number: cow.cowNumber,
      total_quantity: cow.totalQuantity,
      avg_quantity_per_session: cow.avgQuantity,
      total_sessions: cow.records,
      avg_fat_percentage: cow.avgFat,
      avg_snf_percentage: cow.avgSNF,
      lactation_number: cow.lactationNumber,
      days_in_milk: cow.daysInMilk
    }));

    exportToCSV(exportData, 'cow_performance_report', headers);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Milk Production Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Button onClick={handleExportReport} disabled={!productionAnalytics?.rawData}>
                Export Production Report
              </Button>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleExportCowPerformance} disabled={!productionAnalytics?.topPerformers}>
                Export Cow Performance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Production</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {productionAnalytics?.totalProduction || 0} L
            </div>
            <p className="text-xs text-muted-foreground">
              {productionAnalytics?.totalRecords || 0} sessions • {productionAnalytics?.uniqueCows || 0} cows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Production</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {productionAnalytics?.avgProduction || 0} L
            </div>
            <p className="text-xs text-muted-foreground">
              Per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Fat %</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {productionAnalytics?.avgFat || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Milk quality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average SNF %</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {productionAnalytics?.avgSNF || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Solids-not-fat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Session Breakdown and Lactation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Wise Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionAnalytics?.sessionBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${Math.round(Number(value) * 100) / 100} L`, 'Quantity']} />
                  <Bar dataKey="quantity" fill="#3b82f6" name="Total Quantity (L)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {productionAnalytics?.sessionBreakdown?.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <span>{item.name}</span>
                  <div className="text-right">
                    <div className="font-medium">{item.quantity} L ({item.records} sessions)</div>
                    <div className="text-muted-foreground">Avg: {item.avgPerRecord} L/session</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lactation Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productionAnalytics?.lactationData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ lactation, quantity }) => `${lactation}: ${quantity}L`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantity"
                  >
                    {productionAnalytics?.lactationData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${Math.round(Number(value) * 100) / 100} L`, 'Quantity']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {productionAnalytics?.lactationData?.map((item, index) => (
                <div key={item.lactation} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.lactation}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{item.quantity} L</div>
                    <div className="text-muted-foreground">Avg: {item.avgPerRecord} L/session</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Production Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productionAnalytics?.dailyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                  formatter={(value, name) => [
                    name === 'Quantity (L)' ? `${Math.round(Number(value) * 100) / 100} L` : `${Math.round(Number(value) * 100) / 100}%`,
                    name
                  ]}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="quantity" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Quantity (L)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="avgFat" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  name="Avg Fat %"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="avgSNF" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Avg SNF %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Cows */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Cows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cow Number</th>
                  <th className="text-right p-2">Total (L)</th>
                  <th className="text-right p-2">Avg/Session (L)</th>
                  <th className="text-right p-2">Sessions</th>
                  <th className="text-right p-2">Avg Fat %</th>
                  <th className="text-right p-2">Avg SNF %</th>
                  <th className="text-right p-2">Lactation</th>
                  <th className="text-right p-2">Days in Milk</th>
                </tr>
              </thead>
              <tbody>
                {productionAnalytics?.topPerformers?.slice(0, 8).map((cow, index) => (
                  <tr key={cow.cowNumber} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">#{cow.cowNumber}</td>
                    <td className="p-2 text-right font-semibold text-blue-600">{cow.totalQuantity}</td>
                    <td className="p-2 text-right">{cow.avgQuantity}</td>
                    <td className="p-2 text-right">{cow.records}</td>
                    <td className="p-2 text-right">{cow.avgFat}%</td>
                    <td className="p-2 text-right">{cow.avgSNF}%</td>
                    <td className="p-2 text-right">{cow.lactationNumber}</td>
                    <td className="p-2 text-right">{cow.daysInMilk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      )}
    </div>
  );
};