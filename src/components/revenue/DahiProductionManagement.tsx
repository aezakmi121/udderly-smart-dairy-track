import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useDahiProduction } from '@/hooks/useDahiProduction';
import DahiProductionForm from './DahiProductionForm';

export const DahiProductionManagement = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<any>(null);

  const {
    productions,
    isLoading,
    addProductionMutation,
    updateProductionMutation,
    deleteProductionMutation
  } = useDahiProduction();

  const handleAdd = (data: any) => {
    addProductionMutation.mutate(data, {
      onSuccess: () => {
        setIsAddModalOpen(false);
      }
    });
  };

  const handleEdit = (production: any) => {
    setSelectedProduction(production);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (data: any) => {
    if (selectedProduction) {
      updateProductionMutation.mutate(
        { id: selectedProduction.id, ...data },
        {
          onSuccess: () => {
            setIsEditModalOpen(false);
            setSelectedProduction(null);
          }
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this production record?')) {
      deleteProductionMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dahi Production</h1>
          <p className="text-muted-foreground">Track dahi production from FFM</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Production
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : productions && productions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead>FFM Used (L)</TableHead>
              <TableHead>Dahi Yield (kg)</TableHead>
              <TableHead>Conversion Rate</TableHead>
              <TableHead>Production Cost</TableHead>
              <TableHead>Cost/kg</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productions.map((prod) => (
              <TableRow key={prod.id}>
                <TableCell>{format(new Date(prod.production_date), 'dd MMM yyyy')}</TableCell>
                <TableCell>{prod.batch_number || '-'}</TableCell>
                <TableCell>{Number(prod.ffm_used).toFixed(2)} L</TableCell>
                <TableCell>{Number(prod.dahi_yield).toFixed(2)} kg</TableCell>
                <TableCell>{Number(prod.conversion_rate).toFixed(4)}</TableCell>
                <TableCell>₹{prod.production_cost ? Number(prod.production_cost).toFixed(2) : '-'}</TableCell>
                <TableCell>₹{prod.cost_per_kg ? Number(prod.cost_per_kg).toFixed(2) : '-'}/kg</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(prod)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(prod.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">No production records found.</div>
      )}

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Dahi Production</DialogTitle>
            <DialogDescription>
              Record dahi production batch
            </DialogDescription>
          </DialogHeader>
          <DahiProductionForm
            onSubmit={handleAdd}
            isLoading={addProductionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Dahi Production</DialogTitle>
            <DialogDescription>
              Update production record
            </DialogDescription>
          </DialogHeader>
          <DahiProductionForm
            onSubmit={handleUpdate}
            isLoading={updateProductionMutation.isPending}
            initialData={selectedProduction}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
