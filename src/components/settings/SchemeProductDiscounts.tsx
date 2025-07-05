
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useSchemeDiscounts } from '@/hooks/useSchemeDiscounts';
import { usePOSData } from '@/hooks/usePOSData';

interface SchemeProductDiscountsProps {
  schemeId: string;
  schemeName: string;
}

export const SchemeProductDiscounts: React.FC<SchemeProductDiscountsProps> = ({
  schemeId,
  schemeName
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
  const { discounts, isLoading, discountMutation, deleteDiscount } = useSchemeDiscounts();
  const { products } = usePOSData();

  const schemeDiscounts = discounts?.filter(d => d.scheme_id === schemeId) || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const discountData = {
      scheme_id: schemeId,
      product_id: formData.get('product_id') as string,
      discount_type: formData.get('discount_type') as 'percentage' | 'amount',
      discount_value: parseFloat(formData.get('discount_value') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    };

    discountMutation.mutate({
      discountData,
      isUpdate: !!selectedDiscount,
      id: selectedDiscount?.id
    });

    if (!discountMutation.isPending) {
      setIsDialogOpen(false);
      setSelectedDiscount(null);
    }
  };

  const openDialog = (discount?: any) => {
    setSelectedDiscount(discount || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this discount?')) {
      deleteDiscount.mutate(id);
    }
  };

  const getProductName = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Discounts - {schemeName}</CardTitle>
            <p className="text-sm text-muted-foreground">Configure discounts for specific products</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product Discount
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedDiscount ? 'Edit Product Discount' : 'Add Product Discount'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product_id">Product *</Label>
                  <Select name="product_id" defaultValue={selectedDiscount?.product_id || ''} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount_type">Discount Type</Label>
                    <Select name="discount_type" defaultValue={selectedDiscount?.discount_type || 'percentage'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="amount">Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discount_value">Discount Value *</Label>
                    <Input
                      id="discount_value"
                      name="discount_value"
                      type="number"
                      step="0.01"
                      defaultValue={selectedDiscount?.discount_value || 0}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="is_active">Status</Label>
                  <Select name="is_active" defaultValue={selectedDiscount?.is_active?.toString() || 'true'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={discountMutation.isPending}>
                    {discountMutation.isPending ? 'Saving...' : (selectedDiscount ? 'Update' : 'Add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading discounts...</div>
        ) : schemeDiscounts.length === 0 ? (
          <div className="text-center py-4">No product discounts configured.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Discount Type</TableHead>
                <TableHead>Discount Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schemeDiscounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-medium">{getProductName(discount.product_id)}</TableCell>
                  <TableCell className="capitalize">{discount.discount_type}</TableCell>
                  <TableCell>
                    {discount.discount_value}{discount.discount_type === 'percentage' ? '%' : '₹'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={discount.is_active ? 'default' : 'secondary'}>
                      {discount.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(discount)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(discount.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
