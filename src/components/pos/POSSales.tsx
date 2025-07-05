
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { usePOSData } from '@/hooks/usePOSData';
import { useCustomers } from '@/hooks/useCustomers';
import { useSchemeDiscounts } from '@/hooks/useSchemeDiscounts';
import { CategorySection } from './sales/CategorySection';
import { SaleItemsSection } from './sales/SaleItemsSection';
import { BillSummarySection } from './sales/BillSummarySection';
import { PaymentSection } from './sales/PaymentSection';
import { useSaleProcessing } from './sales/SaleProcessing';

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

export const POSSales: React.FC = () => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const { categories, products, productsLoading } = usePOSData();
  const { customers } = useCustomers();
  const { discounts } = useSchemeDiscounts();

  const subTotal = saleItems.reduce((acc, item) => acc + (item.total || (item.price * item.quantity)), 0);

  const totalDiscount = saleItems.reduce((acc, item) => {
    const productDiscount = discounts?.find(
      (discount) => discount.product_id === item.productId
    );

    if (productDiscount) {
      const itemTotal = item.total || (item.price * item.quantity);
      const discountValue = productDiscount.discount_type === 'percentage'
        ? itemTotal * (productDiscount.discount_value / 100)
        : productDiscount.discount_value;
      
      return acc + discountValue;
    }

    return acc;
  }, 0);

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

  const addItemToSale = (product: any, variant: any) => {
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

  // Group products by category for display
  const groupedProducts = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    if (products) {
      products.forEach(product => {
        if (!groups[product.category]) {
          groups[product.category] = [];
        }
        groups[product.category].push(product);
      });
    }
    
    return groups;
  }, [products]);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel - Categories and Products */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle>Select Products</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-full">
            {productsLoading ? (
              <div className="text-center py-4">Loading products...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                  <CategorySection
                    key={category}
                    category={category}
                    products={categoryProducts}
                    onSelectVariant={addItemToSale}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Right Panel - Cart and Checkout */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({saleItems.length} items)
              {saleItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="ml-auto text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1">
              <SaleItemsSection 
                saleItems={saleItems}
                onAddItem={addItemToSale}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
              />
            </div>
            
            {saleItems.length > 0 && (
              <div className="border-t p-4 space-y-4 bg-gray-50/50">
                <BillSummarySection 
                  subtotal={subTotal}
                  totalDiscount={totalDiscount}
                  otherCharges={0}
                  grandTotal={grandTotal}
                />
                
                <Separator />
                
                <PaymentSection 
                  paymentMode={paymentMode}
                  selectedCustomer={selectedCustomer}
                  onPaymentModeChange={setPaymentMode}
                  onCustomerSelect={setSelectedCustomer}
                  onProcessSale={processSale}
                  onClearAll={onClearAll}
                />
                
                <Button 
                  onClick={processSale}
                  className="w-full" 
                  size="lg"
                  disabled={saleItems.length === 0}
                >
                  Complete Sale - ₹{grandTotal.toFixed(2)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
