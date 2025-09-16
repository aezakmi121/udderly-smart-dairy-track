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
          cows!cow_id (cow_number, lactation_number, last_calving_date)
        `)
        .gte('production_date', fromDate)
        .lte('production_date', toDate)
        .order('production_date', { ascending: true });

      if (error) throw error;

      // Overall analytics
      const totalProduction = data.reduce((sum, record) => sum + Number(record.quantity), 0);
      const avgProduction = data.length > 0 ? totalProduction / data.length : 0;
      const avgFat = data.length > 0 ? data.reduce((sum, r) => sum + (Number(r.fat_percentage) || 0), 0) / data.length : 0;
      const avgSNF = data.length > 0 ? data.reduce((sum, r) => sum + (Number(r.snf_percentage) || 0), 0) / data.length : 0;

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

      const topPerformers = Object.values(cowPerformance)
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
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

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

      return {
        totalProduction: Math.round(totalProduction * 100) / 100,
        avgProduction: Math.round(avgProduction * 100) / 100,
        avgFat: Math.round(avgFat * 100) / 100,
        avgSNF: Math.round(avgSNF * 100) / 100,
        recordsCount: data.length,
        sessionBreakdown: Object.values(sessionData),
        dailyTrends: processedDailyTrends,
        topPerformers,
        lactationBreakdown: Object.values(lactationData),
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
    if (!productionAnalytics) return;
    
    const pdfData = {
      fromDate,
      toDate,
      totalProduction: productionAnalytics.totalProduction,
      avgProduction: productionAnalytics.avgProduction,
      avgFat: productionAnalytics.avgFat,
      avgSNF: productionAnalytics.avgSNF,
      dailyData: productionAnalytics.dailyTrends
    };
    
    const doc = generateMilkProductionPDF(pdfData);
    doc.save(`milk_production_report_${fromDate}_to_${toDate}.pdf`);
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
                  </div>
                  <Droplets className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Production</p>
                    <p className="text-2xl font-bold">{productionAnalytics.avgProduction} L</p>
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

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Session Wise Production */}
            <Card>
              <CardHeader>
                <CardTitle>Session Wise Production</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionAnalytics.sessionBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="session" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lactation Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Lactation Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productionAnalytics.lactationBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantity"
                      label={({ name, value }) => `${name}: ${value}L`}
                    >
                      {productionAnalytics.lactationBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
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

          {/* Top Performing Cows */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Cows</CardTitle>
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
                    {productionAnalytics.topPerformers.map((cow, index) => (
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