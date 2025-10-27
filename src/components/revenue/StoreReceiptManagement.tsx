import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useStoreReceipts } from '@/hooks/useStoreReceipts';
import StoreReceiptForm from './StoreReceiptForm';

export const StoreReceiptManagement = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    receipts,
    isLoading,
    addReceiptMutation,
    updateReceiptMutation
  } = useStoreReceipts(selectedDate);

  const handleSubmit = (data: any) => {
    if (receipts) {
      updateReceiptMutation.mutate(
        { id: receipts.id, ...data },
        {
          onSuccess: () => {
            setIsModalOpen(false);
          }
        }
      );
    } else {
      addReceiptMutation.mutate(
        { ...data, receipt_date: selectedDate },
        {
          onSuccess: () => {
            setIsModalOpen(false);
          }
        }
      );
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Store Receipts</h1>
          <p className="text-muted-foreground">Record milk received at store</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {receipts ? (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Receipt for {format(new Date(selectedDate), 'dd MMM yyyy')}</h3>
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              Edit Receipt
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cow Milk Received</p>
              <p className="text-2xl font-bold">{Number(receipts.cow_received).toFixed(2)} L</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buffalo Milk Received</p>
              <p className="text-2xl font-bold">{Number(receipts.buffalo_received).toFixed(2)} L</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mixed Milk Received</p>
              <p className="text-2xl font-bold">{Number(receipts.mixed_received).toFixed(2)} L</p>
            </div>
          </div>
          {receipts.notes && (
            <div className="mt-4 p-3 bg-muted rounded">
              <p className="text-sm font-medium">Notes:</p>
              <p className="text-sm">{receipts.notes}</p>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg mb-4">No receipt recorded for this date</p>
          <Button onClick={() => setIsModalOpen(true)}>
            Add Store Receipt
          </Button>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{receipts ? 'Edit' : 'Add'} Store Receipt</DialogTitle>
            <DialogDescription>
              Record the actual milk received at the store
            </DialogDescription>
          </DialogHeader>
          <StoreReceiptForm
            onSubmit={handleSubmit}
            isLoading={receipts ? updateReceiptMutation.isPending : addReceiptMutation.isPending}
            initialData={receipts}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
