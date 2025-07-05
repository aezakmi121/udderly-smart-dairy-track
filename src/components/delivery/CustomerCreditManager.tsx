
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Minus, History } from 'lucide-react';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';

interface Customer {
  id: string;
  name: string;
  current_credit: number;
  last_payment_date: string | null;
}

interface CustomerCreditManagerProps {
  customer: Customer;
}

export const CustomerCreditManager: React.FC<CustomerCreditManagerProps> = ({ customer }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'payment' | 'adjustment'>('payment');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const { transactions, addTransaction } = useCreditTransactions(customer.id);

  const handleAddTransaction = () => {
    if (amount <= 0) return;
    
    addTransaction.mutate({
      customer_id: customer.id,
      transaction_type: transactionType,
      amount: transactionType === 'payment' ? amount : amount,
      description: description || undefined
    });

    setIsDialogOpen(false);
    setAmount(0);
    setDescription('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Credit</Label>
              <div className="text-2xl font-bold text-red-600">
                ₹{customer.current_credit?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <Label>Last Payment</Label>
              <div className="text-sm text-muted-foreground">
                {customer.last_payment_date 
                  ? new Date(customer.last_payment_date).toLocaleDateString()
                  : 'No payments yet'
                }
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Credit Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Transaction Type</Label>
                    <Select value={transactionType} onValueChange={(value: 'payment' | 'adjustment') => setTransactionType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Payment Received</SelectItem>
                        <SelectItem value="adjustment">Credit Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a note about this transaction"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTransaction}>
                      Record Transaction
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <div className="font-medium">
                      {transaction.transaction_type === 'payment' ? 'Payment' : 
                       transaction.transaction_type === 'credit_sale' ? 'Credit Sale' : 'Adjustment'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                    {transaction.description && (
                      <div className="text-xs text-muted-foreground">{transaction.description}</div>
                    )}
                  </div>
                  <Badge variant={transaction.transaction_type === 'payment' ? 'default' : 'secondary'}>
                    {transaction.transaction_type === 'payment' ? '-' : '+'}₹{transaction.amount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
