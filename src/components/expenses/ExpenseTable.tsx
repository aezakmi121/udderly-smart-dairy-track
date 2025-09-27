import React, { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Edit, Trash2, Filter, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileDataTable } from '@/components/common/MobileDataTable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    // Filter expenses by selected date
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const filteredExpenses = expenses.filter(expense => expense.expense_date === dateStr);
    
    const exportData = filteredExpenses.map(expense => ({
      date: expense.expense_date,
      category: expense.expense_categories?.name || 'N/A',
      source: expense.expense_sources?.name || 'N/A',
      vendor: expense.vendor_name || 'N/A',
      description: expense.description || 'N/A',
      amount: expense.amount,
      status: expense.status,
      paid_by: expense.paid_by || 'N/A',
      payment_date: expense.payment_date || 'N/A',
    }));

    const headers = [
      'date', 'category', 'source', 'vendor', 'description', 
      'amount', 'status', 'paid_by', 'payment_date'
    ];

    exportToCSV(exportData, `expenses-${dateStr}`, headers);
  };

  const columns = [
    {
      key: 'expense_date',
      header: 'Date',
      label: 'Date',
      accessorKey: 'expense_date',
      cell: ({ row }: { row: any }) => (
        <div className="font-medium">
          {format(new Date(row.original.expense_date), 'MMM dd, yyyy')}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      label: 'Category',
      accessorKey: 'expense_categories.name',
      cell: ({ row }: { row: any }) => (
        <div className="font-medium">
          {row.original.expense_categories?.name || 'N/A'}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      label: 'Source',
      accessorKey: 'expense_sources.name',
      cell: ({ row }: { row: any }) => (
        <div className="text-muted-foreground">
          {row.original.expense_sources?.name || 'N/A'}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      label: 'Description',
      accessorKey: 'description',
      cell: ({ row }: { row: any }) => (
        <div className="max-w-[200px] truncate">
          {row.original.description || 'No description'}
        </div>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor',
      label: 'Vendor',
      accessorKey: 'vendor_name',
      cell: ({ row }: { row: any }) => (
        <div className="text-muted-foreground">
          {row.original.vendor_name || 'N/A'}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      label: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }: { row: any }) => (
        <div className="font-semibold">
          ₹{Number(row.original.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      label: 'Status',
      accessorKey: 'status',
      cell: ({ row }: { row: any }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      key: 'payment_date',
      header: 'Payment Date',
      label: 'Payment Date',
      accessorKey: 'payment_date',
      cell: ({ row }: { row: any }) => (
        <div className="text-muted-foreground">
          {row.original.payment_date 
            ? format(new Date(row.original.payment_date), 'MMM dd, yyyy')
            : 'Not paid'
          }
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      label: 'Actions',
      id: 'actions',
      cell: ({ row }: { row: any }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteExpense.mutate(row.original.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            disabled={expenses.length === 0}
            className="text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </div>
      </div>

      <MobileDataTable
        columns={columns}
        data={expenses}
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