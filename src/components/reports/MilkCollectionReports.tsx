import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';
import { format, subDays } from 'date-fns';
import { Droplets, TrendingUp, IndianRupee, Scale } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6'];

export const MilkCollectionReports = () => {
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { exportToCSV } = useReportExports();

  // Fetch collection analytics for selected date range
  const { data: collectionAnalytics, isLoading } = useQuery({
    queryKey: ['milk-collection-analytics', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_collections')
        .select(`
          *,
          farmers!milk_collections_farmer_id_fkey (name, farmer_code)
        `)
        .gte('collection_date', fromDate)
        .lte('collection_date', toDate)
        .order('collection_date', { ascending: true });

      if (error) throw error;

      // Calculate analytics
      const totalQuantity = data.reduce((sum, record) => sum + Number(record.quantity), 0);
      const totalAmount = data.reduce((sum, record) => sum + Number(record.total_amount), 0);
      const avgAmount = totalAmount / data.length || 0;
      const avgRate = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

      // Species breakdown
      const cowMilk = data.filter(record => record.species === 'Cow');
      const buffaloMilk = data.filter(record => record.species === 'Buffalo');
      
      const cowQuantity = cowMilk.reduce((sum, record) => sum + Number(record.quantity), 0);
      const buffaloQuantity = buffaloMilk.reduce((sum, record) => sum + Number(record.quantity), 0);
      const cowAmount = cowMilk.reduce((sum, record) => sum + Number(record.total_amount), 0);
      const buffaloAmount = buffaloMilk.reduce((sum, record) => sum + Number(record.total_amount), 0);

      // Daily trends
      const dailyTrends = data.reduce((acc, record) => {
        const date = record.collection_date;
        if (!acc[date]) {
          acc[date] = { date, quantity: 0, amount: 0, records: 0 };
        }
        acc[date].quantity += Number(record.quantity);
        acc[date].amount += Number(record.total_amount);
        acc[date].records += 1;
        return acc;
      }, {} as Record<string, any>);

      // Session breakdown
      const morningData = data.filter(record => record.session === 'morning');
      const eveningData = data.filter(record => record.session === 'evening');

      return {
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        avgAmount: Math.round(avgAmount * 100) / 100,
        avgRate: Math.round(avgRate * 100) / 100,
        totalRecords: data.length,
        speciesBreakdown: [
          { name: 'Cow', quantity: Math.round(cowQuantity * 100) / 100, amount: Math.round(cowAmount * 100) / 100, percentage: totalQuantity > 0 ? Math.round((cowQuantity / totalQuantity) * 100) : 0 },
          { name: 'Buffalo', quantity: Math.round(buffaloQuantity * 100) / 100, amount: Math.round(buffaloAmount * 100) / 100, percentage: totalQuantity > 0 ? Math.round((buffaloQuantity / totalQuantity) * 100) : 0 }
        ],
        dailyTrends: Object.values(dailyTrends).map(trend => ({
          ...trend,
          quantity: Math.round(trend.quantity * 100) / 100,
          amount: Math.round(trend.amount * 100) / 100
        })).sort((a, b) => a.date.localeCompare(b.date)),
        sessionBreakdown: [
          { name: 'Morning', quantity: Math.round(morningData.reduce((sum, record) => sum + Number(record.quantity), 0) * 100) / 100, records: morningData.length },
          { name: 'Evening', quantity: Math.round(eveningData.reduce((sum, record) => sum + Number(record.quantity), 0) * 100) / 100, records: eveningData.length }
        ],
        rawData: data
      };
    },
    enabled: !!fromDate && !!toDate
  });

  const handleExportReport = async () => {
    if (!collectionAnalytics?.rawData) return;

    const headers = [
      'collection_date', 
      'farmer_name', 
      'farmer_code', 
      'session', 
      'species', 
      'quantity', 
      'fat_percentage', 
      'snf_percentage', 
      'rate_per_liter', 
      'total_amount',
      'remarks'
    ];
    
    const exportData = collectionAnalytics.rawData.map(record => ({
      collection_date: record.collection_date,
      farmer_name: record.farmers?.name || 'N/A',
      farmer_code: record.farmers?.farmer_code || 'N/A',
      session: record.session,
      species: record.species,
      quantity: record.quantity,
      fat_percentage: record.fat_percentage,
      snf_percentage: record.snf_percentage,
      rate_per_liter: record.rate_per_liter,
      total_amount: record.total_amount,
      remarks: record.remarks || ''
    }));

    exportToCSV(exportData, 'milk_collection_comprehensive_report', headers);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Milk Collection Analytics</CardTitle>
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
              <Button onClick={handleExportReport} disabled={!collectionAnalytics?.rawData}>
                Export Detailed Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {collectionAnalytics?.totalQuantity || 0} L
            </div>
            <p className="text-xs text-muted-foreground">
              {collectionAnalytics?.totalRecords || 0} collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{collectionAnalytics?.totalAmount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{collectionAnalytics?.avgAmount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₹{collectionAnalytics?.avgRate || 0}/L
            </div>
            <p className="text-xs text-muted-foreground">
              Per liter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Species Breakdown and Session Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Milk Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collectionAnalytics?.speciesBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantity"
                  >
                    {collectionAnalytics?.speciesBreakdown?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${Math.round(Number(value) * 100) / 100} L`, 'Quantity']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {collectionAnalytics?.speciesBreakdown?.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{item.quantity} L ({item.percentage}%)</div>
                    <div className="text-muted-foreground">₹{item.amount}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Wise Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionAnalytics?.sessionBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" name="Quantity (L)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {collectionAnalytics?.sessionBreakdown?.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <span>{item.name}</span>
                  <div className="text-right">
                    <div className="font-medium">{Math.round(item.quantity * 100) / 100} L</div>
                    <div className="text-muted-foreground">{item.records} collections</div>
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
          <CardTitle>Daily Collection Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionAnalytics?.dailyTrends || []}>
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
                    name === 'Quantity (L)' ? `${Math.round(Number(value) * 100) / 100} L` : `₹${Math.round(Number(value) * 100) / 100}`,
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
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Amount (₹)"
                />
              </LineChart>
            </ResponsiveContainer>
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