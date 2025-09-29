import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Expense } from '@/hooks/useExpenseManagement';

interface ExpenseStatsProps {
  expenses: Expense[];
  selectedDate?: string;
}

export const ExpenseStats: React.FC<ExpenseStatsProps> = ({ expenses, selectedDate }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Daily expenses (when a specific date is selected)
  const dailyExpenses = selectedDate ? expenses.filter(expense => {
    const paymentDate = new Date(expense.payment_date);
    const selected = new Date(selectedDate);
    return paymentDate.toDateString() === selected.toDateString();
  }) : [];

  const totalDaily = dailyExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  // This Month Accrual (based on payment_period)
  const currentMonthExpenses = expenses.filter(expense => {
    const periodDate = new Date(expense.payment_period);
    return periodDate.getMonth() === currentMonth && periodDate.getFullYear() === currentYear;
  });

  const lastMonthExpenses = expenses.filter(expense => {
    const periodDate = new Date(expense.payment_period);
    return periodDate.getMonth() === lastMonth && periodDate.getFullYear() === lastMonthYear;
  });

  const totalCurrentMonth = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalLastMonth = lastMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthlyChange = totalLastMonth === 0 ? 0 : ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100;

  // Accrual (expenses for this period - based on payment_period)
  const accrualAmount = totalCurrentMonth;
  const accrualChange = monthlyChange;

  // Cashflow (expenses paid this month - based on payment_date)
  const currentMonthPayments = expenses.filter(expense => {
    const paymentDate = new Date(expense.payment_date);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  });

  const lastMonthPayments = expenses.filter(expense => {
    const paymentDate = new Date(expense.payment_date);
    return paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === lastMonthYear;
  });

  const totalCurrentMonthPayments = currentMonthPayments.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalLastMonthPayments = lastMonthPayments.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const cashflowChange = totalLastMonthPayments === 0 ? 0 : ((totalCurrentMonthPayments - totalLastMonthPayments) / totalLastMonthPayments) * 100;

  const stats = selectedDate ? [
    {
      title: 'Selected Date',
      value: `₹${totalDaily.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: undefined,
      icon: Calendar,
      description: `${dailyExpenses.length} expenses on ${new Date(selectedDate).toLocaleDateString('en-IN')}`,
    },
    {
      title: 'This Month',
      value: `₹${totalCurrentMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: monthlyChange,
      icon: DollarSign,
      description: `${currentMonthExpenses.length} expenses`,
    },
    {
      title: 'Cashflow',
      value: `₹${totalCurrentMonthPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: cashflowChange,
      icon: CreditCard,
      description: `${currentMonthPayments.length} payments made`,
    },
  ] : [
    {
      title: 'This Month',
      value: `₹${totalCurrentMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: monthlyChange,
      icon: DollarSign,
      description: `${currentMonthExpenses.length} expenses`,
    },
    {
      title: 'Accrual',
      value: `₹${accrualAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: accrualChange,
      icon: Calendar,
      description: 'Expenses incurred',
    },
    {
      title: 'Cashflow',
      value: `₹${totalCurrentMonthPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: cashflowChange,
      icon: CreditCard,
      description: `${currentMonthPayments.length} payments made`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};