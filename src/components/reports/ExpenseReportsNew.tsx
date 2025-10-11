import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DollarSign, TrendingUp, CreditCard, Calendar, FileText, Download, Share, Loader2, AlertCircle } from 'lucide-react';
import { generateExpenseReportPDF, generateWhatsAppMessage } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#84cc16'];

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
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories!expenses_category_id_fkey (name),
          expense_sources!expenses_source_id_fkey (name),
          payment_methods!expenses_payment_method_id_fkey (name)
        `)
        .gte(reportType === 'accrual' ? 'payment_period' : 'payment_date', fromDate)
        .lte(reportType === 'accrual' ? 'payment_period' : 'payment_date', toDate)
        .order(reportType === 'accrual' ? 'payment_period' : 'payment_date', { ascending: true });

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
      const pdfData = {
        fromDate,
        toDate,
        reportType,
        totalExpenses: expenseAnalytics.totalExpenses,
        averagePerMonth: expenseAnalytics.averagePerMonth,
        recordsCount: expenseAnalytics.recordsCount,
        categoryBreakdown: expenseAnalytics.categoryBreakdown,
        monthlyTrends: expenseAnalytics.monthlyTrends,
        transactions: expenseAnalytics.rawData.map(record => ({
          date: reportType === 'accrual' ? record.payment_period : record.payment_date,
          amount: record.amount,
          category: record.expense_categories?.name || 'Uncategorized',
          source: record.expense_sources?.name || 'Not Specified',
          paymentMethod: record.payment_methods?.name || 'Not Specified',
          vendor: record.vendor_name || 'N/A',
          paidBy: record.paid_by || 'N/A',
          description: record.description || 'N/A',
          receiptUrl: record.receipt_url || null
        }))
      };
      
      const doc = generateExpenseReportPDF(pdfData);
      doc.save(`expense_${reportType}_report_${fromDate}_to_${toDate}.pdf`);
      toast({ title: "PDF downloaded successfully!" });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "PDF generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!expenseAnalytics) return;
    
    const message = generateWhatsAppMessage('expenses', {
      fromDate,
      toDate,
      totalExpenses: expenseAnalytics.totalExpenses,
      averagePerMonth: expenseAnalytics.averagePerMonth,
      recordsCount: expenseAnalytics.recordsCount,
      reportType: reportType === 'accrual' ? 'Accrual' : 'Cashflow',
      sourceBreakdown: expenseAnalytics.sourceBreakdown
    });
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
    </div>
  );
};
