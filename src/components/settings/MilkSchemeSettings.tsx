import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';
import { SchemeProductDiscounts } from './SchemeProductDiscounts';

interface MilkScheme {
  id: string;
  scheme_name: string;
  cow_milk_rate: number;
  buffalo_milk_rate: number;
  discount_type: 'amount' | 'percentage';
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const MilkSchemeSettings = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<MilkScheme | null>(null);
  const [showDiscounts, setShowDiscounts] = useState<string | null>(null);
  const { schemes, isLoading, schemeMutation, deleteScheme } = useMilkSchemes();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const schemeData = {
      scheme_name: formData.get('scheme_name') as string,
      cow_milk_rate: parseFloat(formData.get('cow_milk_rate') as string),
      buffalo_milk_rate: parseFloat(formData.get('buffalo_milk_rate') as string),
      discount_type: formData.get('discount_type') as 'amount' | 'percentage',
      discount_value: parseFloat(formData.get('discount_value') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    };

    schemeMutation.mutate({
      schemeData,
      isUpdate: !!selectedScheme,
      id: selectedScheme?.id
    });

    if (!schemeMutation.isPending) {
      setIsDialogOpen(false);
      setSelectedScheme(null);
    }
  };

  const openDialog = (scheme?: MilkScheme) => {
    setSelectedScheme(scheme || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this scheme?')) {
      deleteScheme.mutate(id);
    }
  };

  if (showDiscounts) {
    const scheme = schemes?.find(s => s.id === showDiscounts);
    if (scheme) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowDiscounts(null)}>
              ← Back to Schemes
            </Button>
            <h3 className="text-lg font-medium">Configure Product Discounts</h3>
          </div>
          <SchemeProductDiscounts 
            schemeId={scheme.id} 
            schemeName={scheme.scheme_name} 
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Milk Pricing Schemes</h3>
          <p className="text-sm text-muted-foreground">Configure different pricing schemes for customers</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Scheme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedScheme ? 'Edit Scheme' : 'Add New Scheme'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="scheme_name">Scheme Name *</Label>
                <Input
                  id="scheme_name"
                  name="scheme_name"
                  defaultValue={selectedScheme?.scheme_name || ''}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cow_milk_rate">Cow Milk Rate (₹/L) *</Label>
                  <Input
                    id="cow_milk_rate"
                    name="cow_milk_rate"
                    type="number"
                    step="0.01"
                    defaultValue={selectedScheme?.cow_milk_rate || 60}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buffalo_milk_rate">Buffalo Milk Rate (₹/L) *</Label>
                  <Input
                    id="buffalo_milk_rate"
                    name="buffalo_milk_rate"
                    type="number"
                    step="0.01"
                    defaultValue={selectedScheme?.buffalo_milk_rate || 75}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_type">Discount Type</Label>
                  <Select name="discount_type" defaultValue={selectedScheme?.discount_type || 'amount'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Amount (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="discount_value">Discount Value</Label>
                  <Input
                    id="discount_value"
                    name="discount_value"
                    type="number"
                    step="0.01"
                    defaultValue={selectedScheme?.discount_value || 0}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="is_active">Status</Label>
                <Select name="is_active" defaultValue={selectedScheme?.is_active?.toString() || 'true'}>
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
                <Button type="submit" disabled={schemeMutation.isPending}>
                  {schemeMutation.isPending ? 'Saving...' : (selectedScheme ? 'Update' : 'Add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Schemes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading schemes...</div>
          ) : schemes?.length === 0 ? (
            <div className="text-center py-4">No schemes found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cow Rate</TableHead>
                  <TableHead>Buffalo Rate</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes?.map((scheme) => (
                  <TableRow key={scheme.id}>
                    <TableCell className="font-medium">{scheme.scheme_name}</TableCell>
                    <TableCell>₹{scheme.cow_milk_rate}/L</TableCell>
                    <TableCell>₹{scheme.buffalo_milk_rate}/L</TableCell>
                    <TableCell>
                      {scheme.discount_value > 0 
                        ? `${scheme.discount_value}${scheme.discount_type === 'percentage' ? '%' : '₹'}`
                        : 'No discount'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={scheme.is_active ? 'default' : 'secondary'}>
                        {scheme.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDiscounts(scheme.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(scheme)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(scheme.id)}
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
    </div>
  );
};
