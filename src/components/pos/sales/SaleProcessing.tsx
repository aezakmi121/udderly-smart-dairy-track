
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';

interface SaleItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  discount?: number;
  total: number;
  fractionalAllowed: boolean;
}

interface SaleProcessingProps {
  saleItems: SaleItem[];
  paymentMode: string;
  selectedCustomer: string;
  grandTotal: number;
  onClearAll: () => void;
}

export const SaleProcessing: React.FC<SaleProcessingProps> = ({
  saleItems,
  paymentMode,
  selectedCustomer,
  grandTotal,
  onClearAll
}) => {
  const { toast } = useToast();
  const { addTransaction } = useCreditTransactions();

  const processSale = async () => {
    if (saleItems.length === 0) {
      toast({ title: "No items in cart", variant: "destructive" });
      return;
    }

    if (!paymentMode) {
      toast({ title: "Please select payment mode", variant: "destructive" });
      return;
    }

    if (paymentMode === 'credit' && !selectedCustomer) {
      toast({ title: "Please select customer for credit sale", variant: "destructive" });
      return;
    }

    try {
      if (paymentMode === 'credit' && selectedCustomer) {
        const referenceId = crypto.randomUUID();
        
        await addTransaction.mutateAsync({
          customer_id: selectedCustomer,
          transaction_type: 'credit_sale',
          amount: grandTotal,
          description: `POS Sale - ${saleItems.length} items`,
          reference_id: referenceId
        });
      }

      toast({ 
        title: "Sale processed successfully!", 
        description: paymentMode === 'credit' ? "Credit transaction recorded" : "Payment received"
      });
      onClearAll();
    } catch (error: any) {
      console.error('Sale processing error:', error);
      toast({ 
        title: "Failed to process sale", 
        description: error.message || "An error occurred while processing the sale",
        variant: "destructive" 
      });
    }
  };

  return { processSale };
};
