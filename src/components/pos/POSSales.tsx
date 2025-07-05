
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2, ShoppingCart, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  discount?: number;
  total: number;
}

export const POSSales = () => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentMode, setPaymentMode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const { toast } = useToast();

  const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = discount + saleItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  const grandTotal = subtotal - totalDiscount + otherCharges;

  const addItem = () => {
    // This would open a product selection dialog
    toast({ title: "Product selection dialog would open here" });
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

  const processSale = () => {
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

    // Process the sale and generate receipt
    toast({ title: "Sale processed successfully!", description: "Receipt generated" });
    clearAll();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sales Interface */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Current Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              {saleItems.length > 0 && (
                <div className="space-y-2">
                  {saleItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">₹{item.price}/{item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.id, Math.max(0.1, item.quantity - 0.1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-16 text-center">{item.quantity}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 0.1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Badge variant="secondary">₹{item.total.toFixed(2)}</Badge>
                        <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Charges */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Charges & Discounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Other Charges (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bill Summary */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Bill Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other Charges:</span>
                <span>₹{otherCharges.toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="upi">Bhim/UPI</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMode === 'credit' && (
              <div>
                <Label>Select Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer for credit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer1">John Doe - 9876543210</SelectItem>
                    <SelectItem value="customer2">Jane Smith - 9876543211</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={processSale} className="w-full" size="lg">
                Process Sale
              </Button>
              <Button onClick={clearAll} variant="outline" className="w-full">
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
