
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, BarChart3, TrendingUp, Receipt, Download, FileText } from 'lucide-react';
import { useReportExports } from '@/hooks/useReportExports';

export const POSReports = () => {
  const [dateRange, setDateRange] = useState('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { exportToCSV } = useReportExports();

  const salesData = {
    total_sales: 15850,
    total_receipts: 45,
    avg_sale_value: 352,
    payment_modes: {
      cash: 8500,
      card: 4200,
      upi: 2650,
      credit: 500
    }
  };

  const topSellingItems = [
    { name: 'Cow Milk 1L', sold: 25, revenue: 1375 },
    { name: 'Cow Milk 500ml', sold: 18, revenue: 540 },
    { name: 'Dahi 250g', sold: 12, revenue: 480 },
  ];

  const generateReport = () => {
    // Mock report generation
    console.log('Generating report for:', { dateRange, fromDate, toDate });
  };

  const exportToPDF = () => {
    // Mock PDF export
    console.log('Exporting to PDF...');
    // Here you would integrate with a PDF generation library like jsPDF
    alert('PDF export functionality will be implemented');
  };

  const exportToExcel = () => {
    const reportData = [
      {
        metric: 'Total Sales',
        value: salesData.total_sales,
        date: new Date().toISOString().split('T')[0]
      },
      {
        metric: 'Total Receipts',
        value: salesData.total_receipts,
        date: new Date().toISOString().split('T')[0]
      },
      {
        metric: 'Average Sale Value',
        value: salesData.avg_sale_value,
        date: new Date().toISOString().split('T')[0]
      }
    ];

    exportToCSV(reportData, 'pos_sales_report', ['metric', 'value', 'date']);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Store Reports</h2>
          <p className="text-muted-foreground">Analytics and reports for your store</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Quick Select</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div>
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button onClick={generateReport}>Generate Report</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{salesData.total_sales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+20.1% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData.total_receipts}</div>
            <p className="text-xs text-muted-foreground">+5 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sale Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{salesData.avg_sale_value}</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Sales</CardTitle>
            <Badge variant="secondary">₹{salesData.payment_modes.credit}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{salesData.payment_modes.credit}</div>
            <p className="text-xs text-muted-foreground">3.2% of total sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Modes */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Mode Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(salesData.payment_modes).map(([mode, amount]) => (
              <div key={mode} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {mode.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">₹{amount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {((amount / salesData.total_sales) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Selling Items */}
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Items Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topSellingItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.sold} units sold</div>
                </div>
                <Badge variant="secondary">₹{item.revenue}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
