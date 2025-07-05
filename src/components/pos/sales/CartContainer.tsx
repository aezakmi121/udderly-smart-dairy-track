
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CartHeader } from './CartHeader';
import { SaleItemsSection } from './SaleItemsSection';
import { CartActions } from './CartActions';
import { SaleItem, Product, ProductVariant } from './types';

interface CartContainerProps {
  saleItems: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  paymentMode: string;
  selectedCustomer: string;
  onAddItem: (product: Product, variant: ProductVariant) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onPaymentModeChange: (mode: string) => void;
  onCustomerSelect: (customerId: string) => void;
  onProcessSale: () => void;
  onClearAll: () => void;
}

export const CartContainer: React.FC<CartContainerProps> = ({
  saleItems,
  subtotal,
  totalDiscount,
  grandTotal,
  paymentMode,
  selectedCustomer,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onPaymentModeChange,
  onCustomerSelect,
  onProcessSale,
  onClearAll
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CartHeader 
          itemCount={saleItems.length}
          onClearAll={onClearAll}
        />
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1">
          <SaleItemsSection 
            saleItems={saleItems}
            onAddItem={onAddItem}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
          />
        </div>
        
        <CartActions
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          grandTotal={grandTotal}
          paymentMode={paymentMode}
          selectedCustomer={selectedCustomer}
          onPaymentModeChange={onPaymentModeChange}
          onCustomerSelect={onCustomerSelect}
          onProcessSale={onProcessSale}
          onClearAll={onClearAll}
          hasItems={saleItems.length > 0}
        />
      </CardContent>
    </Card>
  );
};
