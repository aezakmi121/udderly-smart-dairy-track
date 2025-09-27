import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Receipt, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Expense } from '@/hooks/useExpenseManagement';

interface ExpenseStatsProps {
  expenses: Expense[];
}

export const ExpenseStats: React.FC<ExpenseStatsProps> = ({ expenses }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });

  const lastMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === lastMonthYear;
  });

  const totalCurrentMonth = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalLastMonth = lastMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  
  const monthlyChange = totalLastMonth === 0 ? 0 : ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100;
  
  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const totalPending = pendingExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  
  const overdueExpenses = expenses.filter(expense => expense.status === 'overdue');
  const totalOverdue = overdueExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const paidThisMonth = currentMonthExpenses.filter(expense => expense.status === 'paid').length;

  const stats = [
    {
      title: 'This Month',
      value: `₹${totalCurrentMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: monthlyChange,
      icon: DollarSign,
      description: `${currentMonthExpenses.length} expenses`,
    },
    {
      title: 'Pending Payments',
      value: `₹${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      count: pendingExpenses.length,
      icon: Clock,
      description: `${pendingExpenses.length} pending`,
      variant: 'secondary' as const,
    },
    {
      title: 'Overdue',
      value: `₹${totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      count: overdueExpenses.length,
      icon: AlertTriangle,
      description: `${overdueExpenses.length} overdue`,
      variant: 'destructive' as const,
    },
    {
      title: 'Paid This Month',
      value: paidThisMonth.toString(),
      icon: Receipt,
      description: 'Completed payments',
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isIncrease = stat.change !== undefined && stat.change > 0;
        const isDecrease = stat.change !== undefined && stat.change < 0;

        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.change !== undefined && (
                  <div className="flex items-center space-x-1">
                    {isIncrease && <TrendingUp className="h-3 w-3 text-red-500" />}
                    {isDecrease && <TrendingDown className="h-3 w-3 text-green-500" />}
                    <span className={`text-xs ${isIncrease ? 'text-red-500' : isDecrease ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                  </div>
                )}
                {stat.variant && (
                  <Badge 
                    variant={stat.variant} 
                    className="text-xs"
                  >
                    {stat.count}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};