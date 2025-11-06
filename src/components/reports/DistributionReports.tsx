import { useState, useMemo, useRef } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Share2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useDistributionAnalytics } from '@/hooks/useDistributionAnalytics';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { captureRecharts } from '@/utils/chartCapture';
import { generateDistributionReportPDF, generateDistributionWhatsAppMessage, type DistributionPdfData } from '@/utils/pdf/generateDistributionReportPDF';

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const DistributionReports = () => {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  // Refs for hidden charts (PDF export)
  const distributionPieRef = useRef<HTMLDivElement>(null);
  const sourceComparisonRef = useRef<HTMLDivElement>(null);
  const monthlyTrendsRef = useRef<HTMLDivElement>(null);
  const speciesDonutRef = useRef<HTMLDivElement>(null);

  const { data: analytics, isLoading, error } = useDistributionAnalytics(fromDate, toDate);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    const now = new Date();
    
    switch (range) {
      case 'today':
        setFromDate(format(now, 'yyyy-MM-dd'));
        setToDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setFromDate(format(yesterday, 'yyyy-MM-dd'));
        setToDate(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'week':
        setFromDate(format(subDays(now, 7), 'yyyy-MM-dd'));
        setToDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'month':
        setFromDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
    }
  };

  const distributionData = useMemo(() => {
    if (!analytics) return [];
    
    return [
      { name: 'Store', value: analytics.storeDispatched },
      { name: 'Plant', value: analytics.plantDispatched },
      { name: 'Cream Extraction', value: analytics.creamExtracted },
      { name: 'Cash Sales', value: analytics.cashSales },
      { name: 'Mixing', value: analytics.mixing },
    ].filter(item => item.value > 0);
  }, [analytics]);

  const sourceComparisonData = useMemo(() => {
    if (!analytics) return [];
    
    return [
      { name: 'Farm', cow: analytics.farmProduction, buffalo: 0 },
      { name: 'Collection Center', cow: 0, buffalo: analytics.collectionCenterProduction },
    ];
  }, [analytics]);

  const handleExportCSV = () => {
    if (!analytics) return;
    
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Production', `${analytics.totalProduction.toFixed(1)} L`],
      ['Farm Production', `${analytics.farmProduction.toFixed(1)} L`],
      ['Collection Center', `${analytics.collectionCenterProduction.toFixed(1)} L`],
      ['Store Dispatched', `${analytics.storeDispatched.toFixed(1)} L`],
      ['Store Received', `${analytics.storeReceived.toFixed(1)} L`],
      ['Discrepancy', `${analytics.storeDiscrepancy.toFixed(1)} L`],
      ['Plant Dispatched', `${analytics.plantDispatched.toFixed(1)} L`],
      ['Plant Revenue', `Rs.${analytics.plantRevenue.toLocaleString('en-IN')}`],
      ['Cream Extracted', `${analytics.creamExtracted.toFixed(1)} L`],
      ['FFM Generated', `${analytics.ffmGenerated.toFixed(1)} L`],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distribution-report-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported",
      description: "Distribution report exported successfully",
    });
  };

  const handleExportPDF = async () => {
    if (!analytics) return;
    
    setIsExporting(true);
    
    try {
      // Capture all charts
      const distributionPieImg = await captureRecharts(distributionPieRef.current!);
      const sourceComparisonImg = await captureRecharts(sourceComparisonRef.current!);
      const monthlyTrendsImg = analytics.monthlyTrends.length > 1 
        ? await captureRecharts(monthlyTrendsRef.current!) 
        : '';
      const speciesDonutImg = await captureRecharts(speciesDonutRef.current!);

      // Calculate cow breakdown (simplified for now)
      const cowBreakdown = {
        farmEvening: analytics.farmProduction * 0.4,
        farmMorning: analytics.farmProduction * 0.6,
        ccEvening: 0,
        ccMorning: 0,
        storeTotal: analytics.storeDispatched * 0.5,
        creamTotal: analytics.creamExtracted,
        ffmToCalves: analytics.ffmGenerated * 0.5,
        ffmToPlant: analytics.ffmGenerated * 0.3,
        ffmToDahi: analytics.ffmGenerated * 0.2,
      };

      const buffaloBreakdown = {
        ccEvening: analytics.collectionCenterProduction * 0.45,
        ccMorning: analytics.collectionCenterProduction * 0.55,
        storeTotal: analytics.storeDispatched * 0.5,
        plantTotal: analytics.plantDispatched,
        plantRevenue: analytics.plantRevenue,
      };

      const pdfData: DistributionPdfData = {
        fromDate,
        toDate,
        totalProduction: analytics.totalProduction,
        farmProduction: analytics.farmProduction,
        collectionCenterProduction: analytics.collectionCenterProduction,
        storeDispatched: analytics.storeDispatched,
        storeReceived: analytics.storeReceived,
        storeDiscrepancy: analytics.storeDiscrepancy,
        plantDispatched: analytics.plantDispatched,
        plantRevenue: analytics.plantRevenue,
        creamExtracted: analytics.creamExtracted,
        ffmGenerated: analytics.ffmGenerated,
        cashSales: analytics.cashSales,
        mixing: analytics.mixing,
        cowBreakdown,
        buffaloBreakdown,
        images: {
          distributionPie: distributionPieImg,
          sourceComparison: sourceComparisonImg,
          monthlyTrends: monthlyTrendsImg,
          speciesDonut: speciesDonutImg,
        },
      };

      const pdf = generateDistributionReportPDF(pdfData);
      pdf.save(`distribution-report-${fromDate}-to-${toDate}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Distribution report PDF generated successfully",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!analytics) return;
    
    const message = generateDistributionWhatsAppMessage({
      fromDate,
      toDate,
      totalProduction: analytics.totalProduction,
      farmProduction: analytics.farmProduction,
      collectionCenterProduction: analytics.collectionCenterProduction,
      storeDispatched: analytics.storeDispatched,
      storeReceived: analytics.storeReceived,
      plantDispatched: analytics.plantDispatched,
      plantRevenue: analytics.plantRevenue,
    });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading distribution analytics: {error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Distribution Reports</h1>
        <p className="text-muted-foreground">Comprehensive milk distribution analytics and reports</p>
      </div>

      {/* Configuration Section */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex flex-wrap gap-2">
              {(['today', 'yesterday', 'week', 'month', 'custom'] as DateRange[]).map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateRangeChange(range)}
                  className="capitalize"
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm" disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Generating PDF...' : 'Export PDF'}
            </Button>
            <Button onClick={handleWhatsAppShare} variant="outline" size="sm" disabled={isExporting}>
              <Share2 className="h-4 w-4 mr-2" />
              Share via WhatsApp
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-20" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Display */}
      {!isLoading && analytics && (
        <>
          {/* Summary KPI Cards (2x2 Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Production */}
            <Card className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Production</p>
                <p className="text-3xl font-bold">
                  {analytics.totalProduction.toFixed(1)} L
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Farm: {analytics.farmProduction.toFixed(1)} L
                  </span>
                  <span className="text-muted-foreground">
                    CC: {analytics.collectionCenterProduction.toFixed(1)} L
                  </span>
                </div>
              </div>
            </Card>

            {/* Store Dispatch vs Receipt */}
            <Card className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Store Dispatch vs Receipt</p>
                <p className="text-3xl font-bold">
                  {analytics.storeDispatched.toFixed(1)} L → {analytics.storeReceived.toFixed(1)} L
                </p>
                <div className="flex items-center gap-2">
                  {Math.abs(analytics.storeDiscrepancy) < 2 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm text-success">
                        Discrepancy: {analytics.storeDiscrepancy.toFixed(1)} L (OK)
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">
                        Discrepancy: {analytics.storeDiscrepancy.toFixed(1)} L
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Plant Dispatch + Revenue */}
            <Card className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Plant Dispatch + Revenue</p>
                <p className="text-3xl font-bold">
                  {analytics.plantDispatched.toFixed(1)} L
                </p>
                <p className="text-lg text-muted-foreground">
                  Revenue: ₹{analytics.plantRevenue.toLocaleString('en-IN')}
                </p>
              </div>
            </Card>

            {/* Cream Extracted + FFM */}
            <Card className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cream + FFM</p>
                <p className="text-3xl font-bold">
                  {analytics.creamExtracted.toFixed(1)} L
                </p>
                <p className="text-lg text-muted-foreground">
                  FFM: {analytics.ffmGenerated.toFixed(1)} L
                </p>
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution Pie Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Distribution Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Source Comparison Bar Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Source Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourceComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cow" fill="#8b5cf6" name="Cow" />
                  <Bar dataKey="buffalo" fill="#3b82f6" name="Buffalo" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Monthly Trends Line Chart */}
            {analytics.monthlyTrends.length > 1 && (
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="production" stroke="#8b5cf6" name="Production" />
                    <Line type="monotone" dataKey="storeDispatched" stroke="#3b82f6" name="Store" />
                    <Line type="monotone" dataKey="plantDispatched" stroke="#10b981" name="Plant" />
                    <Line type="monotone" dataKey="creamExtracted" stroke="#f59e0b" name="Cream" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>

          {/* Hidden Charts for PDF Export */}
          <div className="fixed -left-[9999px] top-0 w-[800px]">
            <div ref={distributionPieRef} className="bg-white p-6" style={{ width: 800, height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div ref={sourceComparisonRef} className="bg-white p-6" style={{ width: 800, height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cow" fill="#8b5cf6" name="Cow" />
                  <Bar dataKey="buffalo" fill="#3b82f6" name="Buffalo" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {analytics?.monthlyTrends && analytics.monthlyTrends.length > 1 && (
              <div ref={monthlyTrendsRef} className="bg-white p-6" style={{ width: 800, height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="production" stroke="#8b5cf6" name="Production" />
                    <Line type="monotone" dataKey="storeDispatched" stroke="#3b82f6" name="Store" />
                    <Line type="monotone" dataKey="plantDispatched" stroke="#10b981" name="Plant" />
                    <Line type="monotone" dataKey="creamExtracted" stroke="#f59e0b" name="Cream" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div ref={speciesDonutRef} className="bg-white p-6" style={{ width: 800, height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Farm (Cow)', value: analytics?.farmProduction || 0 },
                      { name: 'Collection Center', value: analytics?.collectionCenterProduction || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    <Cell fill="#8b5cf6" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
