
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, User, CreditCard } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';

interface Customer {
  id: string;
  name: string;
  phone_number: string;
  current_credit: number;
  customer_code: string;
  area: string | null;
}

interface CustomerSelectorProps {
  selectedCustomerId: string;
  onCustomerSelect: (customerId: string) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomerId,
  onCustomerSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { customers } = useCustomers();

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone_number.includes(searchTerm) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <User className="h-4 w-4 mr-2" />
          {selectedCustomer ? (
            <div className="flex items-center gap-2">
              <span>{selectedCustomer.name}</span>
              {selectedCustomer.current_credit > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Credit: ₹{selectedCustomer.current_credit}
                </Badge>
              )}
            </div>
          ) : (
            'Select Customer'
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, phone, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {customer.phone_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {customer.customer_code} {customer.area && `• ${customer.area}`}
                    </div>
                  </div>
                  {customer.current_credit > 0 && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      ₹{customer.current_credit}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                {searchTerm ? 'No customers found matching your search.' : 'No customers available.'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
