import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReportExports } from '@/hooks/useReportExports';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, CreditCard, Calendar, FileText } from 'lucide-react';
import { generateExpenseReportPDF, generateWhatsAppMessage } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b'];

export const ExpenseReports = () => {
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { exportToCSV } = useReportExports();
  const { toast } = useToast();

  // Fetch expense analytics for selected date range
  const { data: expenseAnalytics, isLoading } = useQuery({
    queryKey: ['expense-analytics', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories!expenses_category_id_fkey (name),
          expense_sources!expenses_source_id_fkey (name),
          payment_methods!expenses_payment_method_id_fkey (name)
        `)
        .gte('expense_date', fromDate)
        .lte('expense_date', toDate)
        .order('expense_date', { ascending: true });

      if (error) throw error;

      // Calculate analytics
      const totalExpenses = data.reduce((sum, record) => sum + Number(record.amount), 0);
      const paidExpenses = data.filter(r => r.status === 'paid').reduce((sum, record) => sum + Number(record.amount), 0);
      const pendingExpenses = data.filter(r => r.status === 'pending').reduce((sum, record) => sum + Number(record.amount), 0);

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
        const month = record.expense_date.substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { month, amount: 0, count: 0 };
        }
        acc[month].amount += Number(record.amount);
        acc[month].count += 1;
        return acc;
      }, {} as any);

      // Status breakdown
      const statusBreakdown = [
        { name: 'Paid', amount: paidExpenses, count: data.filter(r => r.status === 'paid').length },
        { name: 'Pending', amount: pendingExpenses, count: data.filter(r => r.status === 'pending').length },
        { name: 'Overdue', amount: data.filter(r => r.status === 'overdue').reduce((sum, record) => sum + Number(record.amount), 0), count: data.filter(r => r.status === 'overdue').length }
      ];

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

      return {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        paidExpenses: Math.round(paidExpenses * 100) / 100,
        pendingExpenses: Math.round(pendingExpenses * 100) / 100,
        recordsCount: data.length,
        categoryBreakdown: Object.values(categoryData).map((cat: any) => ({
          name: cat.name,
          amount: Math.round(cat.amount * 100) / 100,
          count: cat.count,
          percentage: Math.round((cat.amount / totalExpenses) * 100 * 100) / 100
        })),
        monthlyTrends: Object.values(monthlyTrends).map((trend: any) => ({
          month: trend.month,
          amount: Math.round(trend.amount * 100) / 100,
          count: trend.count
        })).sort((a, b) => a.month.localeCompare(b.month)),
        statusBreakdown,
        paymentMethodBreakdown: Object.values(paymentMethodData),
        rawData: data
      };
    },
    enabled: !!fromDate && !!toDate
  });

  const handleExportReport = async () => {
    if (!expenseAnalytics?.rawData) return;

    const headers = [
      'expense_date',
      'description', 
      'category',
      'source',
      'vendor_name',
      'amount',
      'status',
      'payment_method',
      'payment_date',
      'notes'
    ];
    
    const exportData = expenseAnalytics.rawData.map(record => ({
      expense_date: record.expense_date,
      description: record.description || '',
      category: record.expense_categories?.name || 'N/A',
      source: record.expense_sources?.name || 'N/A',
      vendor_name: record.vendor_name || 'N/A',
      amount: record.amount,
      status: record.status,
      payment_method: record.payment_methods?.name || 'N/A',
      payment_date: record.payment_date || '',
      notes: record.notes || ''
    }));

    exportToCSV(exportData, 'expense_comprehensive_report', headers);
  };

  const handleDownloadPDF = () => {
    if (!expenseAnalytics) {
      toast({ title: "No data available", description: "Cannot generate PDF without data", variant: "destructive" });
      return;
    }
    
    const pdfData = {
      fromDate,
      toDate,
      totalExpenses: expenseAnalytics.totalExpenses || 0,
      paidExpenses: expenseAnalytics.paidExpenses || 0,
      pendingExpenses: expenseAnalytics.pendingExpenses || 0,
      categoryBreakdown: expenseAnalytics.categoryBreakdown || [],
      monthlyTrends: expenseAnalytics.monthlyTrends || []
    };
    
    try {
      const doc = generateExpenseReportPDF(pdfData);
      doc.save(`expense_report_${fromDate}_to_${toDate}.pdf`);
      toast({ title: "PDF downloaded successfully!" });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "PDF generation failed", description: "Please try again", variant: "destructive" });
    }
  };

  const handleWhatsAppShare = () => {
    if (!expenseAnalytics) return;
    
    const message = generateWhatsAppMessage('expenses', {
      fromDate,
      toDate,
      totalExpenses: expenseAnalytics.totalExpenses,
      paidExpenses: expenseAnalytics.paidExpenses,
      pendingExpenses: expenseAnalytics.pendingExpenses
    });
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading expense analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Analytics</CardTitle>
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
                WhatsApp Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {expenseAnalytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold">₹{expenseAnalytics.totalExpenses.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold text-green-600">₹{expenseAnalytics.paidExpenses.toLocaleString()}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">₹{expenseAnalytics.pendingExpenses.toLocaleString()}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{expenseAnalytics.recordsCount}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={expenseAnalytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseAnalytics.statusBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']} />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};