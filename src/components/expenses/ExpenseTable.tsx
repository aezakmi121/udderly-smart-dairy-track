import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Filter, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileDataTable } from '@/components/common/MobileDataTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ExpenseFiltersModal } from './ExpenseFiltersModal';
import { useExpenseManagement, type Expense, type ExpenseFilters } from '@/hooks/useExpenseManagement';
import { useReportExports } from '@/hooks/useReportExports';

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (expense: Expense) => void;
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  isLoading,
  onEdit,
  filters,
  onFiltersChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { deleteExpense } = useExpenseManagement();
  const { exportToCSV } = useReportExports();

  // Filter expenses by selected date
  const filteredExpenses = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return expenses.filter(expense => expense.payment_date === dateStr);
  }, [expenses, selectedDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleExport = () => {
    // Use already filtered expenses
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const exportData = filteredExpenses.map(expense => ({
      category: expense.expense_categories?.name || 'N/A',
      source: expense.expense_sources?.name || 'N/A',
      vendor: expense.vendor_name || 'N/A',
      description: expense.description || 'N/A',
      amount: expense.amount,
      status: expense.status,
      paid_by: expense.paid_by || 'N/A',
    }));

    const headers = [
      'category', 'source', 'vendor', 'description', 
      'amount', 'status', 'paid_by'
    ];

    exportToCSV(exportData, `expenses-${dateStr}`, headers);
  };

  const columns = [
    {
      key: 'category',
      label: 'Category',
      render: (value: any, row: Expense) => (
        <div className="font-medium">
          {row.expense_categories?.name || '-'}
        </div>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (value: any, row: Expense) => (
        <div className="text-muted-foreground">
          {row.expense_sources?.name || '-'}
        </div>
      ),
    },
    {
      key: 'vendor_name',
      label: 'Vendor',
      render: (value: any, row: Expense) => (
        <div className="text-muted-foreground">
          {row.vendor_name || '-'}
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (value: any, row: Expense) => (
        <div className="max-w-[200px] truncate">
          {row.description || 'No description'}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value: any, row: Expense) => (
        <div className="font-semibold">
          ₹{Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: any, row: Expense) => (
        <Badge className={getStatusColor(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'paid_by',
      label: 'Paid By',
      render: (value: any, row: Expense) => (
        <div className="text-muted-foreground">
          {row.paid_by || '-'}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="text-sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal text-sm",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </span>
                <span className="sm:hidden">
                  {selectedDate ? format(selectedDate, "MMM dd") : "Date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredExpenses.length === 0}
            className="text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} for {format(selectedDate, 'MMM dd, yyyy')}
        </div>
      </div>

      <MobileDataTable
        columns={columns}
        data={filteredExpenses}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={(expense) => deleteExpense.mutate(expense.id)}
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
    </div>
  );
};