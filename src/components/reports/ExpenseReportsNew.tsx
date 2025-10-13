import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart, LabelList } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DollarSign, TrendingUp, CreditCard, Calendar, FileText, Download, Share, Loader2, AlertCircle } from 'lucide-react';
import { generateExpenseReportPDF, generateExpenseWhatsAppMessage } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { captureRecharts, waitForChartRender } from '@/utils/chartCapture';
import { prepCategoryData, fmtMonth } from '@/utils/format';

const CHART_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

type ReportType = 'accrual' | 'cashflow';

interface ExpenseAnalytics {
  totalExpenses: number;
  averagePerMonth: number;
  recordsCount: number;
  categoryBreakdown: Array<{ name: string; amount: number; count: number; percentage: number }>;
  monthlyTrends: Array<{ month: string; amount: number; count: number }>;
  paymentMethodBreakdown: Array<{ name: string; amount: number; count: number }>;
  sourceBreakdown: Array<{ name: string; amount: number; count: number; categories: Array<{ name: string; amount: number; count: number }> }>;
  rawData: any[];
}

export const ExpenseReportsNew = () => {
  const [reportType, setReportType] = useState<ReportType>('accrual');
  const [dateRange, setDateRange] = useState('current_month');
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  
  const { exportToCSV } = useReportExports();
  const { toast } = useToast();

  // Refs for chart capture
  const categoryDonutRef = useRef<HTMLDivElement>(null);
  const monthlyTrendsRef = useRef<HTMLDivElement>(null);
  const paymentBarsRef = useRef<HTMLDivElement>(null);
  const drilldownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Auto-update date range when preset is selected
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const now = new Date();
    
    switch (range) {
      case 'current_month':
        setFromDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setFromDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'last_3_months':
        const threeMonthsAgo = subMonths(now, 3);
        setFromDate(format(startOfMonth(threeMonthsAgo), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'custom':
        // Keep current dates for custom range
        break;
      default:
        break;
    }
  };

  // Fetch expense analytics based on report type
  const { data: expenseAnalytics, isLoading, error } = useQuery({
    queryKey: ['expense-analytics', reportType, fromDate, toDate],
    queryFn: async (): Promise<ExpenseAnalytics> => {
      // For accrual, we need to check if the payment_period month falls within the date range
      let query = supabase
        .from('expenses')
        .select(`
          *,
          expense_categories!expenses_category_id_fkey (name),
          expense_sources!expenses_source_id_fkey (name),
          payment_methods!expenses_payment_method_id_fkey (name)
        `);

      if (reportType === 'accrual') {
        // For accrual, payment_period is stored as first day of month
        // We need to get all records where the month falls within our date range
        const fromMonth = fromDate.substring(0, 7); // YYYY-MM
        const toMonth = toDate.substring(0, 7); // YYYY-MM
        query = query
          .gte('payment_period', `${fromMonth}-01`)
          .lte('payment_period', `${toMonth}-01`)
          .order('payment_period', { ascending: true });
      } else {
        // For cashflow, use exact payment_date
        query = query
          .gte('payment_date', fromDate)
          .lte('payment_date', toDate)
          .order('payment_date', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate analytics
      const totalExpenses = data.reduce((sum, record) => sum + Number(record.amount), 0);

      // Category breakdown
      const categoryData = data.reduce((acc, record) => {
        const category = record.expense_categories?.name || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = { name: category, amount: 0, count: 0 };
        }
        acc[category].amount += Number(record.amount);
        acc[category].count += 1;
        return acc;
      }, {} as any);

      // Monthly trends
      const monthlyTrends = data.reduce((acc, record) => {
        const dateField = reportType === 'accrual' ? record.payment_period : record.payment_date;
        const month = dateField.substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { month, amount: 0, count: 0 };
        }
        acc[month].amount += Number(record.amount);
        acc[month].count += 1;
        return acc;
      }, {} as any);

      const monthlyTrendsArray = Object.values(monthlyTrends).map((trend: any) => ({
        month: trend.month,
        amount: Math.round(trend.amount * 100) / 100,
        count: trend.count
      })).sort((a, b) => a.month.localeCompare(b.month));

      const monthCount = monthlyTrendsArray.length || 1;
      const averagePerMonth = totalExpenses / monthCount;

      // Payment method breakdown
      const paymentMethodData = data.reduce((acc, record) => {
        const method = record.payment_methods?.name || 'Not Specified';
        if (!acc[method]) {
          acc[method] = { name: method, amount: 0, count: 0 };
        }
        acc[method].amount += Number(record.amount);
        acc[method].count += 1;
        return acc;
      }, {} as any);

      // Source breakdown with categories
      const sourceData = data.reduce((acc, record) => {
        const source = record.expense_sources?.name || 'Not Specified';
        const category = record.expense_categories?.name || 'Uncategorized';
        
        if (!acc[source]) {
          acc[source] = { name: source, amount: 0, count: 0, categories: {} };
        }
        
        acc[source].amount += Number(record.amount);
        acc[source].count += 1;
        
        if (!acc[source].categories[category]) {
          acc[source].categories[category] = { name: category, amount: 0, count: 0 };
        }
        
        acc[source].categories[category].amount += Number(record.amount);
        acc[source].categories[category].count += 1;
        
        return acc;
      }, {} as any);

      const sourceBreakdown = Object.values(sourceData).map((source: any) => ({
        name: source.name,
        amount: Math.round(source.amount * 100) / 100,
        count: source.count,
        categories: Object.values(source.categories).map((cat: any) => ({
          name: cat.name,
          amount: Math.round(cat.amount * 100) / 100,
          count: cat.count
        }))
      }));

      return {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        averagePerMonth: Math.round(averagePerMonth * 100) / 100,
        recordsCount: data.length,
        categoryBreakdown: Object.values(categoryData).map((cat: any) => ({
          name: cat.name,
          amount: Math.round(cat.amount * 100) / 100,
          count: cat.count,
          percentage: Math.round((cat.amount / totalExpenses) * 100 * 100) / 100
        })),
        monthlyTrends: monthlyTrendsArray,
        paymentMethodBreakdown: Object.values(paymentMethodData),
        sourceBreakdown,
        rawData: data
      };
    },
    enabled: !!fromDate && !!toDate,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleExportCSV = async () => {
    if (!expenseAnalytics?.rawData) return;
    
    setIsExporting(true);
    try {
      const headers = [
        'payment_date',
        'payment_period', 
        'description',
        'category',
        'source',
        'vendor_name',
        'amount',
        'status',
        'payment_method',
        'paid_by',
        'notes'
      ];
      
      const exportData = expenseAnalytics.rawData.map(record => ({
        payment_date: record.payment_date,
        payment_period: format(new Date(record.payment_period), 'MMMM yyyy'),
        description: record.description || '',
        category: record.expense_categories?.name || 'N/A',
        source: record.expense_sources?.name || 'N/A',
        vendor_name: record.vendor_name || 'N/A',
        amount: record.amount,
        status: record.status,
        payment_method: record.payment_methods?.name || 'N/A',
        paid_by: record.paid_by || 'N/A',
        notes: record.notes || ''
      }));

      const filename = `expense_${reportType}_report_${fromDate}_to_${toDate}`;
      exportToCSV(exportData, filename, headers);
    } catch (error) {
      toast({ title: "Export failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!expenseAnalytics) return;
    
    setIsExporting(true);
    try {
      toast({ title: "Preparing charts...", description: "Please wait" });
      
      // Wait longer for charts to render properly
      await waitForChartRender(1000);
      
      // Capture category donut chart
      let categoryDonutImage = '';
      if (categoryDonutRef.current) {
        categoryDonutImage = await captureRecharts(categoryDonutRef.current, { scale: 2, backgroundColor: '#ffffff' });
      }
      
      // Capture monthly trends chart
      let monthlyTrendsImage = '';
      if (monthlyTrendsRef.current) {
        monthlyTrendsImage = await captureRecharts(monthlyTrendsRef.current, { scale: 2, backgroundColor: '#ffffff' });
      }
      
      // Capture payment bars chart
      let paymentBarsImage = '';
      if (paymentBarsRef.current) {
        paymentBarsImage = await captureRecharts(paymentBarsRef.current, { scale: 2, backgroundColor: '#ffffff' });
      }
      
      // Capture drilldown charts (source distribution per category)
      const drilldownImages: Array<{ category: string; image: string }> = [];
      const categoriesWithData = expenseAnalytics.categoryBreakdown
        .filter(cat => cat.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      
      for (const category of categoriesWithData) {
        const ref = drilldownRefs.current[category.name];
        if (ref) {
          const image = await captureRecharts(ref, { scale: 2, backgroundColor: '#ffffff' });
          drilldownImages.push({ category: category.name, image });
        }
      }
      
      toast({ title: "Generating PDF...", description: "Almost done" });
      
      const pdfData = {
        fromDate,
        toDate,
        reportType,
        totalExpenses: expenseAnalytics.totalExpenses,
        averagePerMonth: expenseAnalytics.averagePerMonth,
        recordsCount: expenseAnalytics.recordsCount,
        categoryBreakdown: expenseAnalytics.categoryBreakdown,
        monthlyTrends: expenseAnalytics.monthlyTrends,
        paymentMethods: expenseAnalytics.paymentMethodBreakdown,
        sourceBreakdown: expenseAnalytics.sourceBreakdown,
        transactions: expenseAnalytics.rawData.map(record => ({
          date: reportType === 'accrual' ? record.payment_period : record.payment_date,
          amount: record.amount,
          category: record.expense_categories?.name || 'Uncategorized',
          source: record.expense_sources?.name || 'Not Specified',
          paymentMethod: record.payment_methods?.name || 'Not Specified',
          vendor: record.vendor_name || 'N/A',
          paidBy: record.paid_by || 'N/A',
          description: record.description || 'N/A',
          status: record.status || 'N/A',
          receiptUrl: record.receipt_url || null
        })),
        images: {
          categoryDonut: categoryDonutImage,
          monthlyTrends: monthlyTrendsImage,
          paymentBars: paymentBarsImage,
          drilldowns: drilldownImages
        }
      };
      
      const doc = generateExpenseReportPDF(pdfData);
      doc.save(`expense_${reportType}_report_${fromDate}_to_${toDate}.pdf`);
      toast({ title: "PDF downloaded successfully!" });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "PDF generation failed", description: String(error), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!expenseAnalytics) return;
    
    const message = generateExpenseWhatsAppMessage({
      fromDate,
      toDate,
      totalExpenses: expenseAnalytics.totalExpenses,
      averagePerMonth: expenseAnalytics.averagePerMonth,
      recordsCount: expenseAnalytics.recordsCount,
      reportType,
      categoryBreakdown: expenseAnalytics.categoryBreakdown,
      sourceBreakdown: expenseAnalytics.sourceBreakdown
    });
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  // Prepare category data with "Others" for small categories
  const preparedCategoryData = useMemo(() => {
    if (!expenseAnalytics) return [];
    return prepCategoryData(expenseAnalytics.categoryBreakdown, { othersThresholdPct: 2 });
  }, [expenseAnalytics]);

  // Prepare source distribution for each category
  const categorySourceData = useMemo(() => {
    if (!expenseAnalytics) return {};
    
    const result: { [category: string]: Array<{ name: string; amount: number; percentage: number }> } = {};
    
    expenseAnalytics.categoryBreakdown.forEach(cat => {
      const categoryTransactions = expenseAnalytics.rawData.filter(
        txn => (txn.expense_categories?.name || 'Uncategorized') === cat.name
      );
      
      const sourceData = categoryTransactions.reduce((acc, txn) => {
        const source = txn.expense_sources?.name || 'Not Specified';
        if (!acc[source]) {
          acc[source] = 0;
        }
        acc[source] += Number(txn.amount);
        return acc;
      }, {} as Record<string, number>);
      
      result[cat.name] = Object.entries(sourceData).map(([name, amount]) => ({
        name,
        amount: Number(amount),
        percentage: (Number(amount) / Number(cat.amount)) * 100
      })).sort((a, b) => b.amount - a.amount);
    });
    
    return result;
  }, [expenseAnalytics]);

  if (error) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            There was a problem loading the expense data. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expense Reports</h1>
          <p className="text-muted-foreground">
            Analyze expenses with accrual and cashflow views
          </p>
        </div>
        <Badge variant={reportType === 'accrual' ? 'default' : 'secondary'} className="text-sm">
          {reportType === 'accrual' ? 'Accrual Accounting' : 'Cashflow Accounting'}
        </Badge>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report Type Toggle */}
          <Tabs value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="accrual" className="text-sm">
                📊 Accrual
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="text-sm">
                💰 Cashflow
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={dateRange !== 'custom'}
            />

            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={dateRange !== 'custom'}
            />

            <div className="flex gap-1">
              <Button 
                onClick={handleExportCSV} 
                variant="outline" 
                size="sm" 
                disabled={isLoading || isExporting}
                className="flex-1 text-xs"
              >
                {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              </Button>
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                size="sm"
                disabled={isLoading || isExporting}
                className="flex-1 text-xs"
              >
                <FileText className="h-3 w-3" />
              </Button>
              <Button 
                onClick={handleWhatsAppShare} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="flex-1 text-xs"
              >
                <Share className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading expense analytics...</span>
          </CardContent>
        </Card>
      ) : expenseAnalytics ? (
        <>
          {/* Summary Cards - Mobile Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Expenses</p>
                    <p className="text-lg sm:text-xl font-bold">
                      ₹{expenseAnalytics.totalExpenses.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Avg/Month</p>
                    <p className="text-lg sm:text-xl font-bold">
                      ₹{expenseAnalytics.averagePerMonth.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Records</p>
                    <p className="text-lg sm:text-xl font-bold">
                      {expenseAnalytics.recordsCount}
                    </p>
                  </div>
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Report Type</p>
                    <p className="text-lg sm:text-xl font-bold capitalize">
                      {reportType}
                    </p>
                  </div>
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts - Mobile Optimized */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expenseAnalytics.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {expenseAnalytics.categoryBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Monthly Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={expenseAnalytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          {expenseAnalytics.paymentMethodBreakdown && expenseAnalytics.paymentMethodBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseAnalytics.paymentMethodBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Data Available</p>
            <p className="text-sm text-muted-foreground text-center">
              No expense data found for the selected date range and report type.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hidden Charts for PDF Export */}
      {expenseAnalytics && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '800px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          {/* Category Donut with Legend and Center Total */}
          <div ref={categoryDonutRef} style={{ width: '800px', height: '400px', backgroundColor: 'white', padding: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={preparedCategoryData}
                  cx={280}
                  cy={200}
                  innerRadius={72}
                  outerRadius={110}
                  dataKey="amount"
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  labelLine={{ stroke: '#666', strokeWidth: 1 }}
                >
                  {preparedCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']} 
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value, entry: any) => {
                    const percentage = entry.payload.percentage.toFixed(1);
                    const amount = entry.payload.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 });
                    return `${value}: ${percentage}% (₹${amount})`;
                  }}
                />
                <text x={280} y={190} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '14px', fontWeight: 'bold', fill: '#333' }}>
                  Total
                </text>
                <text x={280} y={210} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '16px', fontWeight: 'bold', fill: '#000' }}>
                  ₹{expenseAnalytics.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Trends Area Chart */}
          <div ref={monthlyTrendsRef} style={{ width: '800px', height: '300px', backgroundColor: 'white', padding: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseAnalytics.monthlyTrends.map(trend => ({
                ...trend,
                monthLabel: fmtMonth(trend.month)
              }))}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f77b4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#1f77b4" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`} />
                <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']} />
                <Area type="monotone" dataKey="amount" stroke="#1f77b4" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)">
                  <LabelList dataKey="amount" position="top" formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`} style={{ fontSize: '11px', fill: '#333' }} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Methods Bar Chart */}
          <div ref={paymentBarsRef} style={{ width: '800px', height: '300px', backgroundColor: 'white', padding: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...expenseAnalytics.paymentMethodBreakdown].sort((a, b) => b.amount - a.amount)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`} />
                <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']} />
                <Bar dataKey="amount" fill="#1f77b4" radius={[8, 8, 0, 0]} label={{ position: 'top', formatter: (value: any) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Source Distribution Donuts per Category */}
          {expenseAnalytics.categoryBreakdown.map((category) => {
            const sourceData = categorySourceData[category.name] || [];
            if (sourceData.length === 0) return null;

            return (
              <div 
                key={category.name}
                ref={(el) => { drilldownRefs.current[category.name] = el; }}
                style={{ width: '800px', height: '350px', backgroundColor: 'white', padding: '20px' }}
              >
                <div style={{ marginBottom: '10px', fontSize: '18px', fontWeight: 'bold', color: '#2980b9' }}>
                  {category.name}
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx={280}
                      cy={155}
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="amount"
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      labelLine={{ stroke: '#666', strokeWidth: 1 }}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']} 
                    />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value, entry: any) => {
                        const percentage = entry.payload.percentage.toFixed(1);
                        const amount = entry.payload.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 });
                        return `${value}: ${percentage}% (₹${amount})`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
