
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';
import { useCustomers } from '@/hooks/useCustomers';
import { useSchemeDiscounts } from '@/hooks/useSchemeDiscounts';
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
  const { customers } = useCustomers();
  const { getDiscountForProduct } = useSchemeDiscounts();

  const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = discount + saleItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  const grandTotal = subtotal - totalDiscount + otherCharges;

  // Apply scheme discounts when customer or items change
  useEffect(() => {
    if (selectedCustomer && saleItems.length > 0) {
      const customer = customers?.find(c => c.id === selectedCustomer);
      if (customer?.scheme_id) {
        const updatedItems = saleItems.map(item => {
          const discount = getDiscountForProduct(customer.scheme_id!, item.productId);
          if (discount) {
            const discountAmount = discount.discount_type === 'percentage' 
              ? (item.price * item.quantity * discount.discount_value) / 100
              : discount.discount_value * item.quantity;
            
            return {
              ...item,
              discount: discountAmount,
              total: (item.price * item.quantity) - discountAmount
            };
          }
          return { ...item, discount: 0, total: item.price * item.quantity };
        });
        setSaleItems(updatedItems);
      }
    }
  }, [selectedCustomer, customers, getDiscountForProduct]);

  const addItem = (newItem: SaleItem) => {
    // Check if customer has a scheme and apply discount
    if (selectedCustomer) {
      const customer = customers?.find(c => c.id === selectedCustomer);
      if (customer?.scheme_id) {
        const discountRule = getDiscountForProduct(customer.scheme_id, newItem.productId);
        if (discountRule) {
          const discountAmount = discountRule.discount_type === 'percentage' 
            ? (newItem.price * newItem.quantity * discountRule.discount_value) / 100
            : discountRule.discount_value * newItem.quantity;
          
          newItem.discount = discountAmount;
          newItem.total = (newItem.price * newItem.quantity) - discountAmount;
        }
      }
    }
    
    setSaleItems(prevItems => [...prevItems, newItem]);
  };

  const updateQuantity = (id: string, quantity: number) => {
    setSaleItems(items => 
      items.map(item => {
        if (item.id === id) {
          let updatedItem = { ...item, quantity };
          
          // Recalculate discount if customer has scheme
          if (selectedCustomer) {
            const customer = customers?.find(c => c.id === selectedCustomer);
            if (customer?.scheme_id) {
              const discountRule = getDiscountForProduct(customer.scheme_id, item.productId);
              if (discountRule) {
                const discountAmount = discountRule.discount_type === 'percentage' 
                  ? (item.price * quantity * discountRule.discount_value) / 100
                  : discountRule.discount_value * quantity;
                
                updatedItem.discount = discountAmount;
                updatedItem.total = (item.price * quantity) - discountAmount;
              } else {
                updatedItem.discount = 0;
                updatedItem.total = item.price * quantity;
              }
            } else {
              updatedItem.total = item.price * quantity - (item.discount || 0);
            }
          } else {
            updatedItem.total = item.price * quantity - (item.discount || 0);
          }
          
          return updatedItem;
        }
        return item;
      })
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
