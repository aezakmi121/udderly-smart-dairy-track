
import React from 'react';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedTransactions = () => {
  const { transactions, isLoading, addTransactionMutation } = useFeedManagement();

  const handleAddTransaction = (data: any) => {
    addTransactionMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <TransactionForm 
        onSubmit={handleAddTransaction} 
        isLoading={addTransactionMutation.isPending}
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
        </div>
        <div className="p-6">
          <TransactionTable transactions={transactions || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
