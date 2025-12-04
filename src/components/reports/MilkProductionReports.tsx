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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateMilkProductionPDF, generateWhatsAppMessage } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4'];

export const MilkProductionReports = () => {
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { exportToCSV } = useReportExports();
  const { toast } = useToast();

  // Fetch production analytics for selected date range
  const { data: productionAnalytics, isLoading } = useQuery({
    queryKey: ['milk-production-analytics', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_production')
        .select(`
          *,
          cows!cow_id (cow_number, lactation_number, last_calving_date, breed)
        `)
        .gte('production_date', fromDate)
        .lte('production_date', toDate)
        .order('production_date', { ascending: true })
        .limit(10000);

      if (error) throw error;

      // Overall analytics
      const totalProduction = data.reduce((sum, record) => sum + Number(record.quantity), 0);
      const avgProduction = data.length > 0 ? totalProduction / data.length : 0;
      const avgFat = data.length > 0 ? data.reduce((sum, r) => sum + (Number(r.fat_percentage) || 0), 0) / data.length : 0;
      const avgSNF = data.length > 0 ? data.reduce((sum, r) => sum + (Number(r.snf_percentage) || 0), 0) / data.length : 0;
      
      // Find peak production day
      const peakDay = data.reduce((max, record) => {
        return Number(record.quantity) > (max.quantity || 0) ? 
          { date: record.production_date, quantity: Number(record.quantity) } : max;
      }, { date: '', quantity: 0 });
      
      // Calculate previous period comparison
      const dateRange = new Date(toDate).getTime() - new Date(fromDate).getTime();
      const prevFromDate = format(new Date(new Date(fromDate).getTime() - dateRange), 'yyyy-MM-dd');
      const prevToDate = format(new Date(new Date(fromDate).getTime() - 1), 'yyyy-MM-dd');
      
      const { data: prevData } = await supabase
        .from('milk_production')
        .select('quantity')
        .gte('production_date', prevFromDate)
        .lte('production_date', prevToDate);
        
      const prevTotalProduction = prevData?.reduce((sum, record) => sum + Number(record.quantity), 0) || 0;
      const periodChange = prevTotalProduction > 0 ? 
        ((totalProduction - prevTotalProduction) / prevTotalProduction * 100) : 0;

      // Session breakdown
      const sessionData = data.reduce((acc, record) => {
        const session = record.session;
        if (!acc[session]) {
          acc[session] = { session, quantity: 0, records: 0 };
        }
        acc[session].quantity += Number(record.quantity);
        acc[session].records += 1;
        return acc;
      }, {} as any);

      // Daily trends
      const dailyTrends = data.reduce((acc, record) => {
        const date = record.production_date;
        if (!acc[date]) {
          acc[date] = { 
            date, 
            quantity: 0, 
            records: 0, 
            totalFat: 0, 
            totalSNF: 0,
            fatRecords: 0,
            snfRecords: 0
          };
        }
        acc[date].quantity += Number(record.quantity);
        acc[date].records += 1;
        
        if (record.fat_percentage) {
          acc[date].totalFat += Number(record.fat_percentage);
          acc[date].fatRecords += 1;
        }
        
        if (record.snf_percentage) {
          acc[date].totalSNF += Number(record.snf_percentage);
          acc[date].snfRecords += 1;
        }
        
        return acc;
      }, {} as any);

      // Process daily trends to calculate averages
      const processedDailyTrends = Object.values(dailyTrends).map((trend: any) => ({
        date: trend.date,
        quantity: Math.round(trend.quantity * 100) / 100,
        avgFat: trend.fatRecords > 0 ? Math.round((trend.totalFat / trend.fatRecords) * 100) / 100 : 0,
        avgSNF: trend.snfRecords > 0 ? Math.round((trend.totalSNF / trend.snfRecords) * 100) / 100 : 0
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Top performing cows
      const cowPerformance = data.reduce((acc, record) => {
        const cowId = record.cow_id;
        const cowNumber = record.cows?.cow_number || 'Unknown';
        
        if (!acc[cowId]) {
          acc[cowId] = {
            cowId,
            cowNumber,
            totalQuantity: 0,
            records: 0,
            totalFat: 0,
            fatRecords: 0,
            totalSNF: 0,
            snfRecords: 0,
            lactationNumber: record.cows?.lactation_number || 0,
            lastCalvingDate: record.cows?.last_calving_date
          };
        }
        
        acc[cowId].totalQuantity += Number(record.quantity);
        acc[cowId].records += 1;
        
        if (record.fat_percentage) {
          acc[cowId].totalFat += Number(record.fat_percentage);
          acc[cowId].fatRecords += 1;
        }
        
        if (record.snf_percentage) {
          acc[cowId].totalSNF += Number(record.snf_percentage);
          acc[cowId].snfRecords += 1;
        }
        
        return acc;
      }, {} as any);

      const allPerformers = Object.values(cowPerformance)
        .map((cow: any) => {
          const daysInMilk = cow.lastCalvingDate ? 
            Math.floor((new Date().getTime() - new Date(cow.lastCalvingDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
            
          return {
            cowNumber: cow.cowNumber,
            totalQuantity: Math.round(cow.totalQuantity * 100) / 100,
            avgQuantity: Math.round((cow.totalQuantity / cow.records) * 100) / 100,
            records: cow.records,
            avgFat: cow.fatRecords > 0 ? Math.round((cow.totalFat / cow.fatRecords) * 100) / 100 : 0,
            avgSNF: cow.snfRecords > 0 ? Math.round((cow.totalSNF / cow.snfRecords) * 100) / 100 : 0,
            lactationNumber: cow.lactationNumber,
            daysInMilk
          };
        })
        .sort((a, b) => b.totalQuantity - a.totalQuantity);
        
      const topPerformers = allPerformers.slice(0, 5);
      const bottomPerformers = allPerformers.slice(-5).reverse();

      // Lactation analysis
      const lactationData = data.reduce((acc, record) => {
        const lactation = record.cows?.lactation_number || 1;
        const key = `Lactation ${lactation}`;
        
        if (!acc[key]) {
          acc[key] = { name: key, quantity: 0, records: 0 };
        }
        
        acc[key].quantity += Number(record.quantity);
        acc[key].records += 1;
        
        return acc;
      }, {} as any);
      
      // Breed analysis
      const breedData = data.reduce((acc, record) => {
        const breed = record.cows?.breed || 'Unknown';
        
        if (!acc[breed]) {
          acc[breed] = { name: breed, quantity: 0, records: 0 };
        }
        
        acc[breed].quantity += Number(record.quantity);
        acc[breed].records += 1;
        
        return acc;
      }, {} as any);
      
      // Session performance comparison
      const sessionComparison = Object.values(sessionData).map((s: any) => ({
        ...s,
        avgPerSession: s.records > 0 ? Math.round((s.quantity / s.records) * 100) / 100 : 0
      }));
      
      const bestSession = sessionComparison.reduce((best, current) => 
        current.quantity > best.quantity ? current : best, sessionComparison[0] || {});
      
      // Days with low production (below average)
      const dailyAvg = totalProduction / processedDailyTrends.length;
      const lowProductionDays = processedDailyTrends.filter(day => day.quantity < dailyAvg * 0.8);

      return {
        totalProduction: Math.round(totalProduction * 100) / 100,
        avgProduction: Math.round(avgProduction * 100) / 100,
        avgFat: Math.round(avgFat * 100) / 100,
        avgSNF: Math.round(avgSNF * 100) / 100,
        recordsCount: data.length,
        sessionBreakdown: Object.values(sessionData) as Array<{ session: string; quantity: number; records: number }>,
        dailyTrends: processedDailyTrends,
        topPerformers,
        bottomPerformers,
        lactationBreakdown: Object.values(lactationData) as Array<{ name: string; quantity: number; records: number }>,
        breedBreakdown: Object.values(breedData) as Array<{ name: string; quantity: number; records: number }>,
        sessionComparison,
        bestSession,
        lowProductionDays,
        peakDay,
        periodChange: Math.round(periodChange * 100) / 100,
        dailyAverage: Math.round(dailyAvg * 100) / 100,
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
    
    const exportData = productionAnalytics.rawData.map(record => {
      const lastCalvingDate = record.cows?.last_calving_date;
      const daysInMilk = lastCalvingDate ? 
        Math.floor((new Date().getTime() - new Date(lastCalvingDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
      return {
        production_date: record.production_date,
        cow_number: record.cows?.cow_number || 'N/A',
        session: record.session,
        quantity: Math.round(Number(record.quantity) * 100) / 100,
        fat_percentage: record.fat_percentage ? Math.round(Number(record.fat_percentage) * 100) / 100 : '',
        snf_percentage: record.snf_percentage ? Math.round(Number(record.snf_percentage) * 100) / 100 : '',
        lactation_number: record.cows?.lactation_number || '',
        days_in_milk: daysInMilk,
        remarks: record.remarks || ''
      };
    });

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

  const handleDownloadPDF = () => {
    if (!productionAnalytics) {
      toast({ title: "No data available", description: "Cannot generate PDF without data", variant: "destructive" });
      return;
    }
    
    const pdfData = {
      fromDate,
      toDate,
      totalProduction: productionAnalytics.totalProduction,
      avgProduction: productionAnalytics.avgProduction,
      avgFat: productionAnalytics.avgFat,
      avgSNF: productionAnalytics.avgSNF,
      dailyAverage: productionAnalytics.dailyAverage,
      peakDay: productionAnalytics.peakDay,
      periodChange: productionAnalytics.periodChange,
      sessionBreakdown: productionAnalytics.sessionBreakdown,
      topPerformers: productionAnalytics.topPerformers,
      bottomPerformers: productionAnalytics.bottomPerformers,
      dailyData: productionAnalytics.dailyTrends
    };
    
    const doc = generateMilkProductionPDF(pdfData);
    doc.save(`milk_production_comprehensive_${fromDate}_to_${toDate}.pdf`);
    toast({ title: "PDF downloaded successfully!" });
  };

  const handleWhatsAppShare = () => {
    if (!productionAnalytics) return;
    
    const message = generateWhatsAppMessage('production', {
      fromDate,
      toDate,
      totalProduction: productionAnalytics.totalProduction,
      avgProduction: productionAnalytics.avgProduction,
      avgFat: productionAnalytics.avgFat,
      avgSNF: productionAnalytics.avgSNF
    });
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Milk Production Analytics</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground self-center">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button onClick={handleExportReport} variant="outline" size="sm" className="text-xs whitespace-nowrap">
              CSV Report
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="text-xs whitespace-nowrap">
              PDF Report
            </Button>
            <Button onClick={handleWhatsAppShare} variant="outline" size="sm" className="text-xs whitespace-nowrap">
              WhatsApp
            </Button>
            <Button onClick={handleExportCowPerformance} variant="outline" size="sm" className="text-xs whitespace-nowrap">
              CSV Performance
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading analytics...</div>
          </CardContent>
        </Card>
      ) : productionAnalytics ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Production</p>
                    <p className="text-2xl font-bold">{productionAnalytics.totalProduction} L</p>
                    {productionAnalytics.periodChange !== undefined && (
                      <p className={`text-xs mt-1 ${productionAnalytics.periodChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {productionAnalytics.periodChange >= 0 ? '+' : ''}{productionAnalytics.periodChange}% vs prev period
                      </p>
                    )}
                  </div>
                  <Droplets className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                    <p className="text-2xl font-bold">{productionAnalytics.dailyAverage} L</p>
                    {productionAnalytics.peakDay?.date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Peak: {productionAnalytics.peakDay.quantity}L on {format(new Date(productionAnalytics.peakDay.date), 'dd MMM')}
                      </p>
                    )}
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Fat</p>
                    <p className="text-2xl font-bold">{productionAnalytics.avgFat}%</p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average SNF</p>
                    <p className="text-2xl font-bold">{productionAnalytics.avgSNF}%</p>
                  </div>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Session Performance Insight */}
          {productionAnalytics.bestSession && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <p className="text-sm">
                    <span className="font-semibold">{productionAnalytics.bestSession.session}</span> session performed best with{' '}
                    <span className="font-semibold">{Math.round(productionAnalytics.bestSession.quantity)} L</span> total production
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Low Production Alert */}
          {productionAnalytics.lowProductionDays && productionAnalytics.lowProductionDays.length > 0 && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">⚠️ Alert:</span> {productionAnalytics.lowProductionDays.length} days had production 
                  below 80% of average ({productionAnalytics.dailyAverage}L). Check: {productionAnalytics.lowProductionDays.slice(0, 3).map(d => format(new Date(d.date), 'dd MMM')).join(', ')}
                  {productionAnalytics.lowProductionDays.length > 3 && ` and ${productionAnalytics.lowProductionDays.length - 3} more`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Session Wise Production */}
            <Card>
              <CardHeader>
                <CardTitle>Session Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionAnalytics.sessionComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="session" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#3b82f6" name="Total (L)" />
                    <Bar dataKey="avgPerSession" fill="#10b981" name="Avg per Session" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Breed Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Production by Breed</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productionAnalytics.breedBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantity"
                      label={({ name, value }) => `${name}: ${Math.round(value)}L`}
                    >
                      {productionAnalytics.breedBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Lactation Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Production by Lactation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionAnalytics.lactationBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Daily Production Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Production Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={productionAnalytics.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#3b82f6" name="Quantity (L)" />
                  <Line yAxisId="right" type="monotone" dataKey="avgFat" stroke="#10b981" name="Avg Fat %" />
                  <Line yAxisId="right" type="monotone" dataKey="avgSNF" stroke="#f97316" name="Avg SNF %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cow Performance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Cows */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">🏆 Top 5 Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Cow</TableHead>
                        <TableHead>Total (L)</TableHead>
                        <TableHead>Avg/Session</TableHead>
                        <TableHead>Sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productionAnalytics.topPerformers.map((cow, index) => (
                        <TableRow key={index} className="bg-green-50">
                          <TableCell className="font-bold text-green-600">#{index + 1}</TableCell>
                          <TableCell className="font-medium">{cow.cowNumber}</TableCell>
                          <TableCell className="font-semibold">{cow.totalQuantity}</TableCell>
                          <TableCell>{cow.avgQuantity}</TableCell>
                          <TableCell>{cow.records}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Bottom Performing Cows */}
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">⚠️ Bottom 5 Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cow</TableHead>
                        <TableHead>Total (L)</TableHead>
                        <TableHead>Avg/Session</TableHead>
                        <TableHead>Days in Milk</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productionAnalytics.bottomPerformers.map((cow, index) => (
                        <TableRow key={index} className="bg-orange-50">
                          <TableCell className="font-medium">{cow.cowNumber}</TableCell>
                          <TableCell>{cow.totalQuantity}</TableCell>
                          <TableCell>{cow.avgQuantity}</TableCell>
                          <TableCell>{cow.daysInMilk}</TableCell>
                          <TableCell>
                            <span className="text-xs text-orange-600">Needs attention</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Cow Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cow Number</TableHead>
                      <TableHead>Total Quantity (L)</TableHead>
                      <TableHead>Avg per Session</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Avg Fat %</TableHead>
                      <TableHead>Avg SNF %</TableHead>
                      <TableHead>Lactation</TableHead>
                      <TableHead>Days in Milk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...productionAnalytics.topPerformers, ...productionAnalytics.bottomPerformers]
                      .sort((a, b) => b.totalQuantity - a.totalQuantity)
                      .map((cow, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{cow.cowNumber}</TableCell>
                          <TableCell>{cow.totalQuantity}</TableCell>
                          <TableCell>{cow.avgQuantity}</TableCell>
                          <TableCell>{cow.records}</TableCell>
                          <TableCell>{cow.avgFat}</TableCell>
                          <TableCell>{cow.avgSNF}</TableCell>
                          <TableCell>{cow.lactationNumber}</TableCell>
                          <TableCell>{cow.daysInMilk}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">No data found for the selected date range.</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};