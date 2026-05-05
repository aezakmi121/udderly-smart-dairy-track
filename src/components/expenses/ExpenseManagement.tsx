import React, { useState } from 'react';
import { Plus, Settings, Upload } from 'lucide-react';
import { ExpenseTable } from './ExpenseTable';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseStats } from './ExpenseStats';
import { ExpenseSettingsModal } from './ExpenseSettingsModal';
import { ImportStatementDialog } from './ImportStatementDialog';
import { PendingReviewsStrip } from './PendingReviewsStrip';
import { useExpenseManagement, type ExpenseFilters } from '@/hooks/useExpenseManagement';
import { MobileOptimizedLayout } from '@/components/mobile/MobileOptimizedLayout';
import { AnimatedButton } from '@/components/ui/animated-button';

export const ExpenseManagement = () => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
    <MobileOptimizedLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expense Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Track and manage all business expenses</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-sm"
              animation="bounce"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </AnimatedButton>
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
              className="text-sm"
              animation="bounce"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Statement
            </AnimatedButton>
            <AnimatedButton 
              onClick={handleCreateExpense} 
              className="text-sm"
              animation="glow"
              haptic={true}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </AnimatedButton>
          </div>
        </div>

      <PendingReviewsStrip />

      <ExpenseStats expenses={expenses} selectedDate={filters.startDate === filters.endDate ? filters.startDate : undefined} />

      <ImportStatementDialog open={showImport} onOpenChange={setShowImport} />

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
    </MobileOptimizedLayout>
  );
};