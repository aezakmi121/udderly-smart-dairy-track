import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, TrendingUp, Settings } from 'lucide-react';
import { ExpenseTable } from './ExpenseTable';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseStats } from './ExpenseStats';
import { ExpenseSettingsModal } from './ExpenseSettingsModal';
import { useExpenseManagement, type ExpenseFilters } from '@/hooks/useExpenseManagement';

export const ExpenseManagement = () => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState<ExpenseFilters>({});

  const { useExpenses } = useExpenseManagement();
  const { data: expenses = [], isLoading } = useExpenses(filters);

  const handleCreateExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleFormClose = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track and manage all business expenses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="text-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleCreateExpense} className="text-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      <ExpenseStats expenses={expenses} selectedDate={filters.startDate === filters.endDate ? filters.startDate : undefined} />

      <ExpenseTable
        expenses={expenses}
        isLoading={isLoading}
        onEdit={handleEditExpense}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {showExpenseForm && (
        <ExpenseForm
          expense={editingExpense}
          onClose={handleFormClose}
        />
      )}

      {showSettings && (
        <ExpenseSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}
    </div>
  );
};