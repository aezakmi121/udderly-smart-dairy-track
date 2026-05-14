import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, startOfDay } from 'date-fns';
import { Filter, Download, Calendar as CalendarIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileDataTable, type CustomAction } from '@/components/common/MobileDataTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ExpenseFiltersModal } from './ExpenseFiltersModal';
import { ReceiptViewModal } from './ReceiptViewModal';
import { useExpenseManagement, type Expense, type ExpenseFilters } from '@/hooks/useExpenseManagement';
import { useReportExports } from '@/hooks/useReportExports';

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (expense: Expense) => void;
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
}

type QuickRange = 'today' | 'yesterday' | 'week' | 'month' | 'last30' | 'year' | 'all' | 'custom';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

const computeRange = (preset: QuickRange): { startDate?: string; endDate?: string } => {
  const now = new Date();
  switch (preset) {
    case 'today': return { startDate: fmt(now), endDate: fmt(now) };
    case 'yesterday': { const y = subDays(now, 1); return { startDate: fmt(y), endDate: fmt(y) }; }
    case 'week': return { startDate: fmt(startOfWeek(now, { weekStartsOn: 1 })), endDate: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case 'month': return { startDate: fmt(startOfMonth(now)), endDate: fmt(endOfMonth(now)) };
    case 'last30': return { startDate: fmt(subDays(startOfDay(now), 29)), endDate: fmt(now) };
    case 'year': return { startDate: fmt(startOfYear(now)), endDate: fmt(endOfYear(now)) };
    case 'all': return { startDate: undefined, endDate: undefined };
    default: return {};
  }
};

const detectPreset = (filters: ExpenseFilters): QuickRange => {
  const presets: QuickRange[] = ['today', 'yesterday', 'week', 'month', 'last30', 'year', 'all'];
  for (const p of presets) {
    const r = computeRange(p);
    if (r.startDate === filters.startDate && r.endDate === filters.endDate) return p;
  }
  return 'custom';
};

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  isLoading,
  onEdit,
  filters,
  onFiltersChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null);
  const { deleteExpense } = useExpenseManagement();
  const { exportToCSV } = useReportExports();

  // Default to today on first mount if no date range set
  useEffect(() => {
    if (!filters.startDate && !filters.endDate) {
      onFiltersChange({ ...filters, ...computeRange('today') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePreset = detectPreset(filters);

  const setPreset = (preset: QuickRange) => {
    onFiltersChange({ ...filters, ...computeRange(preset) });
  };

  const setStartDate = (date?: Date) => {
    onFiltersChange({ ...filters, startDate: date ? fmt(date) : undefined });
  };
  const setEndDate = (date?: Date) => {
    onFiltersChange({ ...filters, endDate: date ? fmt(date) : undefined });
  };

  const rangeLabel = useMemo(() => {
    if (!filters.startDate && !filters.endDate) return 'All time';
    if (filters.startDate && filters.endDate && filters.startDate === filters.endDate) {
      return format(new Date(filters.startDate), 'MMM dd, yyyy');
    }
    const s = filters.startDate ? format(new Date(filters.startDate), 'MMM dd') : '…';
    const e = filters.endDate ? format(new Date(filters.endDate), 'MMM dd, yyyy') : '…';
    return `${s} – ${e}`;
  }, [filters.startDate, filters.endDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleExport = () => {
    const exportData = expenses.map(expense => ({
      date: expense.payment_date,
      category: expense.expense_categories?.name || 'N/A',
      source: expense.expense_sources?.name || 'N/A',
      vendor: expense.vendor_name || 'N/A',
      description: expense.description || 'N/A',
      amount: expense.amount,
      status: expense.status,
      paid_by: expense.paid_by || 'N/A',
    }));
    const headers = ['date', 'category', 'source', 'vendor', 'description', 'amount', 'status', 'paid_by'];
    const suffix = filters.startDate && filters.endDate
      ? `${filters.startDate}_to_${filters.endDate}`
      : 'all';
    exportToCSV(exportData, `expenses-${suffix}`, headers);
  };

  const customActions: CustomAction<Expense>[] = [
    {
      label: 'View Receipt',
      icon: <Eye className="mr-2 h-4 w-4" />,
      onClick: (expense) => setViewingReceipt(expense),
      show: (expense) => !!expense.receipt_url,
    },
  ];

  const columns = [
    { key: 'payment_date', label: 'Date', render: (_: any, row: Expense) => (
      <div className="text-muted-foreground whitespace-nowrap">{format(new Date(row.payment_date), 'dd MMM yyyy')}</div>
    )},
    { key: 'category', label: 'Category', render: (_: any, row: Expense) => (
      <div className="font-medium">{row.expense_categories?.name || '-'}</div>
    )},
    { key: 'source', label: 'Source', render: (_: any, row: Expense) => (
      <div className="text-muted-foreground">{row.expense_sources?.name || '-'}</div>
    )},
    { key: 'vendor_name', label: 'Vendor', render: (_: any, row: Expense) => (
      <div className="text-muted-foreground">{row.vendor_name || '-'}</div>
    )},
    { key: 'description', label: 'Description', render: (_: any, row: Expense) => (
      <div className="max-w-[200px] truncate">{row.description || 'No description'}</div>
    )},
    { key: 'amount', label: 'Amount', render: (_: any, row: Expense) => (
      <div className="font-semibold">₹{Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    )},
    { key: 'status', label: 'Status', render: (_: any, row: Expense) => (
      <Badge className={getStatusColor(row.status)}>{row.status}</Badge>
    )},
    { key: 'paid_by', label: 'Paid By', render: (_: any, row: Expense) => (
      <div className="text-muted-foreground">{row.paid_by || '-'}</div>
    )},
  ];

  const quickRanges: { key: QuickRange; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'last30', label: 'Last 30d' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      {/* Quick range chips */}
      <div className="flex flex-wrap gap-2">
        {quickRanges.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={activePreset === key ? 'default' : 'outline'}
            onClick={() => setPreset(key)}
            className="text-xs h-8"
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(true)} className="text-sm">
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>

          {/* Custom date range pickers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('text-sm', !filters.startDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate ? format(new Date(filters.startDate), 'MMM dd') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.startDate ? new Date(filters.startDate) : undefined}
                onSelect={setStartDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground text-sm">→</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('text-sm', !filters.endDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.endDate ? format(new Date(filters.endDate), 'MMM dd') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.endDate ? new Date(filters.endDate) : undefined}
                onSelect={setEndDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={expenses.length === 0} className="text-sm">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {rangeLabel}
        </div>
      </div>

      <MobileDataTable
        columns={columns}
        data={expenses}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={(expense) => deleteExpense.mutate(expense.id)}
        customActions={customActions}
        mobileCardView={true}
      />

      {showFilters && (
        <ExpenseFiltersModal
          open={showFilters}
          onOpenChange={setShowFilters}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      )}

      {viewingReceipt && (
        <ReceiptViewModal
          open={!!viewingReceipt}
          onOpenChange={(open) => !open && setViewingReceipt(null)}
          receiptUrl={viewingReceipt.receipt_url}
          expenseDescription={viewingReceipt.description || 'No description'}
        />
      )}
    </div>
  );
};
