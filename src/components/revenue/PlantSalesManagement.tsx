import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, TrendingUp, DollarSign, Package, AlertCircle, X } from 'lucide-react';
import { usePlantSales } from '@/hooks/usePlantSales';
import { PlantSalesForm } from './PlantSalesForm';
import { PlantSalesTable } from './PlantSalesTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const PlantSalesManagement = () => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const { plantSales, summary, isLoading, addSaleMutation, updateSaleMutation, deleteSaleMutation } = usePlantSales(startDate, endDate);

  const handleAdd = (data: any) => {
    addSaleMutation.mutate(data, {
      onSuccess: () => setIsAddModalOpen(false)
    });
  };

  const handleEdit = (sale: any) => {
    setSelectedSale(sale);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (data: any) => {
    updateSaleMutation.mutate({ id: selectedSale.id, ...data }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setSelectedSale(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this sale record?')) {
      deleteSaleMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Plant Sales</h1>
      </div>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary?.totalSales.toLocaleString() || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalQuantity.toFixed(1) || 0} L</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary?.avgRate.toFixed(2) || 0}/L</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.pendingPayments || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter + Action Bar */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="start_date" className="text-xs">From</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end_date" className="text-xs">To</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStartDate(today); setEndDate(today); }}
            >
              <X className="h-4 w-4 mr-1" /> Today
            </Button>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sale
          </Button>
        </div>

        {/* Sales Table */}
        <PlantSalesTable
          sales={plantSales || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Add Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Plant Sale</DialogTitle>
            </DialogHeader>
            <PlantSalesForm
              onSubmit={handleAdd}
              isLoading={addSaleMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Plant Sale</DialogTitle>
            </DialogHeader>
            <PlantSalesForm
              initialData={selectedSale}
              onSubmit={handleUpdate}
              isLoading={updateSaleMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
