
import React from 'react';
import { TransactionModal } from './TransactionModal';
import { TransactionTable } from './TransactionTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedTransactions = () => {
  const { transactions, isLoading, createTransactionMutation } = useFeedManagement();

  const handleAddTransaction = (data: any) => {
    createTransactionMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <TransactionModal 
          onSubmit={handleAddTransaction} 
          isLoading={createTransactionMutation.isPending}
        />
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <TransactionTable transactions={transactions || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
