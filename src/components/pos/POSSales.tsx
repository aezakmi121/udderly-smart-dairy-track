
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';
import { SaleItemsSection } from './sales/SaleItemsSection';
import { AdditionalChargesSection } from './sales/AdditionalChargesSection';
import { BillSummarySection } from './sales/BillSummarySection';
import { PaymentSection } from './sales/PaymentSection';

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

export const POSSales = () => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentMode, setPaymentMode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const { toast } = useToast();
  const { addTransaction } = useCreditTransactions();
  const { schemes } = useMilkSchemes();

  const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = discount + saleItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  const grandTotal = subtotal - totalDiscount + otherCharges;

  const addItem = (newItem: SaleItem) => {
    setSaleItems(prevItems => [...prevItems, newItem]);
  };

  const updateQuantity = (id: string, quantity: number) => {
    setSaleItems(items => 
      items.map(item => 
        item.id === id 
          ? { ...item, quantity, total: item.price * quantity - (item.discount || 0) }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setSaleItems(items => items.filter(item => item.id !== id));
  };

  const clearAll = () => {
    setSaleItems([]);
    setDiscount(0);
    setOtherCharges(0);
    setPaymentMode('');
    setSelectedCustomer('');
  };

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
        // Generate a proper UUID for the reference_id
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
      clearAll();
    } catch (error: any) {
      console.error('Sale processing error:', error);
      toast({ 
        title: "Failed to process sale", 
        description: error.message || "An error occurred while processing the sale",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <SaleItemsSection
          saleItems={saleItems}
          onAddItem={addItem}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
        />
        <AdditionalChargesSection
          discount={discount}
          otherCharges={otherCharges}
          onDiscountChange={setDiscount}
          onOtherChargesChange={setOtherCharges}
        />
      </div>

      <div className="space-y-4">
        <BillSummarySection
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          otherCharges={otherCharges}
          grandTotal={grandTotal}
        />
        <PaymentSection
          paymentMode={paymentMode}
          selectedCustomer={selectedCustomer}
          onPaymentModeChange={setPaymentMode}
          onCustomerSelect={setSelectedCustomer}
          onProcessSale={processSale}
          onClearAll={clearAll}
        />
      </div>
    </div>
  );
};
