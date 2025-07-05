
import React, { useState, useEffect } from 'react';
import { usePOSData } from '@/hooks/usePOSData';
import { useCustomers } from '@/hooks/useCustomers';
import { CartContainer } from './sales/CartContainer';
import { useSaleProcessing } from './sales/SaleProcessing';
import { SaleItem, Product, ProductVariant } from './sales/types';

export const POSSales: React.FC = () => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const { products } = usePOSData();
  const { customers } = useCustomers();

  const subTotal = saleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDiscount = 0; // No discounts since scheme system was removed
  const grandTotal = subTotal - totalDiscount;

  const updateQuantity = (id: string, quantity: number) => {
    setSaleItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: quantity, total: item.price * quantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setSaleItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const addItemToSale = (product: Product, variant: ProductVariant) => {
    console.log('Adding item to sale:', product, variant);
    
    const existingItem = saleItems.find(item => item.productId === product.id && item.variantId === variant.id);

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: SaleItem = {
        id: crypto.randomUUID(),
        productId: product.id,
        variantId: variant.id,
        name: `${product.name} - ${variant.name}`,
        price: variant.selling_price,
        quantity: 1,
        unit: variant.unit,
        total: variant.selling_price,
        fractionalAllowed: product.fractional_allowed
      };
      console.log('Created new item:', newItem);
      setSaleItems([...saleItems, newItem]);
    }
  };

  const onClearAll = () => {
    setSaleItems([]);
    setPaymentMode('');
    setSelectedCustomer('');
  };

  const { processSale } = useSaleProcessing({
    saleItems,
    paymentMode,
    selectedCustomer,
    grandTotal,
    onClearAll
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="lg:col-span-2">
        <CartContainer
          saleItems={saleItems}
          subtotal={subTotal}
          totalDiscount={totalDiscount}
          grandTotal={grandTotal}
          paymentMode={paymentMode}
          selectedCustomer={selectedCustomer}
          onAddItem={addItemToSale}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onPaymentModeChange={setPaymentMode}
          onCustomerSelect={setSelectedCustomer}
          onProcessSale={processSale}
          onClearAll={onClearAll}
        />
      </div>
    </div>
  );
};
