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
import { generateMilkCollectionPDF, generatePayoutPDF, generateWhatsAppMessage } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6'];

export const MilkCollectionReports = () => {
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { exportToCSV } = useReportExports();
  const { toast } = useToast();

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
      const avgRate = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

      // Species breakdown
      const speciesData = data.reduce((acc, record) => {
        const species = record.species || 'Cow';
        if (!acc[species]) {
          acc[species] = { name: species, quantity: 0, amount: 0 };
        }
        acc[species].quantity += Number(record.quantity);
        acc[species].amount += Number(record.total_amount);
        return acc;
      }, {} as any);

      // Daily trends
      const dailyTrends = data.reduce((acc, record) => {
        const date = record.collection_date;
        if (!acc[date]) {
          acc[date] = { date, quantity: 0, amount: 0 };
        }
        acc[date].quantity += Number(record.quantity);
        acc[date].amount += Number(record.total_amount);
        return acc;
      }, {} as any);

      // Session breakdown
      const morningData = data.filter(r => r.session === 'morning');
      const eveningData = data.filter(r => r.session === 'evening');

      return {
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        avgRate: Math.round(avgRate * 100) / 100,
        recordsCount: data.length,
        speciesBreakdown: Object.values(speciesData),
        dailyTrends: Object.values(dailyTrends).map((trend: any) => ({
          date: trend.date,
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

  const handleExportPayouts = () => {
    if (!collectionAnalytics?.rawData) return;

    // Group by farmer and calculate totals
    const farmerPayouts = collectionAnalytics.rawData.reduce((acc: any, record) => {
      const farmerId = record.farmer_id;
      const farmerCode = record.farmers?.farmer_code || 'N/A';
      const farmerName = record.farmers?.name || 'N/A';
      
      if (!acc[farmerId]) {
        acc[farmerId] = {
          farmer_code: farmerCode,
          farmer_name: farmerName,
          total_quantity: 0,
          total_amount: 0,
          sessions: 0
        };
      }
      
      acc[farmerId].total_quantity += Number(record.quantity);
      acc[farmerId].total_amount += Number(record.total_amount);
      acc[farmerId].sessions += 1;
      
      return acc;
    }, {});

    const headers = ['farmer_code', 'farmer_name', 'total_quantity', 'total_amount', 'sessions'];
    const exportData = Object.values(farmerPayouts).map((farmer: any) => ({
      farmer_code: farmer.farmer_code,
      farmer_name: farmer.farmer_name,
      total_quantity: Math.round(farmer.total_quantity * 100) / 100,
      total_amount: Math.round(farmer.total_amount * 100) / 100,
      sessions: farmer.sessions
    }));

    exportToCSV(exportData, 'farmer_payouts', headers);
  };

  const handleDownloadPDF = () => {
    if (!collectionAnalytics) return;
    
    const pdfData = {
      fromDate,
      toDate,
      totalQuantity: collectionAnalytics.totalQuantity,
      totalAmount: collectionAnalytics.totalAmount,
      avgRate: collectionAnalytics.avgRate,
      dailyData: collectionAnalytics.dailyTrends
    };
    
    const doc = generateMilkCollectionPDF(pdfData);
    doc.save(`milk_collection_report_${fromDate}_to_${toDate}.pdf`);
    toast({ title: "PDF downloaded successfully!" });
  };

  const handleWhatsAppShare = () => {
    if (!collectionAnalytics) return;
    
    const message = generateWhatsAppMessage('collection', {
      fromDate,
      toDate,
      totalQuantity: collectionAnalytics.totalQuantity,
      totalAmount: collectionAnalytics.totalAmount,
      avgRate: collectionAnalytics.avgRate
    });
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handlePayoutPDF = () => {
    if (!collectionAnalytics?.rawData) return;

    // Group by farmer and calculate totals (only non-zero amounts)
    const farmerPayouts = collectionAnalytics.rawData.reduce((acc: any, record) => {
      const farmerId = record.farmer_id;
      const farmerCode = record.farmers?.farmer_code || 'N/A';
      const farmerName = record.farmers?.name || 'N/A';
      
      if (!acc[farmerId]) {
        acc[farmerId] = {
          farmer_code: farmerCode,
          farmer_name: farmerName,
          total_quantity: 0,
          total_amount: 0
        };
      }
      
      acc[farmerId].total_quantity += Number(record.quantity);
      acc[farmerId].total_amount += Number(record.total_amount);
      
      return acc;
    }, {});

    // Filter non-zero amounts
    const nonZeroFarmers = Object.values(farmerPayouts)
      .filter((farmer: any) => farmer.total_amount > 0)
      .map((farmer: any) => ({
        farmer_code: farmer.farmer_code,
        farmer_name: farmer.farmer_name,
        total_quantity: farmer.total_quantity,
        total_amount: farmer.total_amount
      }));

    const grandTotal = nonZeroFarmers.reduce((sum: number, farmer: any) => sum + farmer.total_amount, 0);

    const pdfData = {
      fromDate,
      toDate,
      farmers: nonZeroFarmers,
      grandTotal
    };

    const doc = generatePayoutPDF(pdfData);
    doc.save(`farmer_payouts_${fromDate}_to_${toDate}.pdf`);
    toast({ title: "Payout PDF downloaded successfully!" });
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Milk Collection Analytics</CardTitle>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <Button onClick={handleExportReport} variant="outline" size="sm" className="text-xs">
              CSV Report
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="text-xs">
              PDF Report
            </Button>
            <Button onClick={handleWhatsAppShare} variant="outline" size="sm" className="text-xs">
              WhatsApp
            </Button>
            <Button onClick={handleExportPayouts} variant="outline" size="sm" className="text-xs">
              CSV Payouts
            </Button>
            <Button onClick={handlePayoutPDF} variant="outline" size="sm" className="text-xs">
              PDF Payouts
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
      ) : collectionAnalytics ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                    <p className="text-2xl font-bold">{collectionAnalytics.totalQuantity} L</p>
                  </div>
                  <Droplets className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">₹{collectionAnalytics.totalAmount}</p>
                  </div>
                  <IndianRupee className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Amount</p>
                    <p className="text-2xl font-bold">₹{Math.round((collectionAnalytics.totalAmount / collectionAnalytics.recordsCount || 0) * 100) / 100}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Rate</p>
                    <p className="text-2xl font-bold">₹{collectionAnalytics.avgRate}/L</p>
                  </div>
                  <Scale className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Milk Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Milk Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={collectionAnalytics.speciesBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantity"
                      label={({ name, value }) => `${name}: ${value}L`}
                    >
                      {collectionAnalytics.speciesBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Session Wise Collection */}
            <Card>
              <CardHeader>
                <CardTitle>Session Wise Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={collectionAnalytics.sessionBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Daily Collection Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Collection Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={collectionAnalytics.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#3b82f6" name="Quantity (L)" />
                  <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#10b981" name="Amount (₹)" />
                </LineChart>
              </ResponsiveContainer>
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