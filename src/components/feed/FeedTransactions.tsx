
import React, { useState } from 'react';
import { TransactionModal } from './TransactionModal';
import { TransactionTable } from './TransactionTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedTransactions = () => {
  const { 
    transactions, 
    isLoading, 
    createTransactionMutation, 
    updateTransactionMutation, 
    deleteTransactionMutation 
  } = useFeedManagement();
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleAddTransaction = (data: any) => {
    createTransactionMutation.mutate(data);
  };

  const handleEditTransaction = (data: any) => {
    if (selectedTransaction) {
      updateTransactionMutation.mutate({ id: selectedTransaction.id, data });
      setIsEditModalOpen(false);
      setSelectedTransaction(null);
    }
  };

  const handleEdit = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransactionMutation.mutate(id);
    }
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
          <TransactionTable 
            transactions={transactions || []} 
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Edit Modal */}
      <TransactionModal
        selectedTransaction={selectedTransaction}
        onSubmit={handleEditTransaction}
        isLoading={updateTransactionMutation.isPending}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  );
};
