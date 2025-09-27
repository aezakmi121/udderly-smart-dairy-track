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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-muted-foreground">Track and manage all business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleCreateExpense}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      <ExpenseStats expenses={expenses} />

      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Recurring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <ExpenseTable
            expenses={expenses}
            isLoading={isLoading}
            onEdit={handleEditExpense}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Analytics</h3>
            <p className="text-muted-foreground">Advanced analytics coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="recurring">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Recurring Expenses</h3>
            <p className="text-muted-foreground">Recurring expense management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

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