import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCollectionCenterSales } from '@/hooks/useCollectionCenterSales';
import { CollectionCenterSalesForm } from './CollectionCenterSalesForm';
import { CollectionCenterSalesTable } from './CollectionCenterSalesTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export const CollectionCenterSalesManagement = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { sales, monthlySummary, isLoading, addSaleMutation, updateSaleMutation, deleteSaleMutation, markAsPaidMutation } = useCollectionCenterSales();

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

  const handleMarkAsPaid = (month: string) => {
    const monthSales = sales?.filter(s => s.payment_month === month && s.payment_status === 'unpaid') || [];
    if (monthSales.length === 0) return;
    
    if (window.confirm(`Mark ${monthSales.length} sales from ${format(new Date(month), 'MMMM yyyy')} as paid?`)) {
      markAsPaidMutation.mutate(monthSales.map(s => s.id));
    }
  };

  const totalUnpaid = sales?.filter(s => s.payment_status === 'unpaid').reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const totalPaid = sales?.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Collection Center Sales</h1>
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList>
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">₹{totalUnpaid.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(totalUnpaid + totalPaid).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Sales Records</h3>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sale
            </Button>
          </div>

          {/* Sales Table */}
          <CollectionCenterSalesTable
            sales={sales || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <div className="space-y-4">
            {monthlySummary && monthlySummary.length > 0 ? (
              monthlySummary.map((summary: any) => (
                <Card key={summary.month}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{format(new Date(summary.month), 'MMMM yyyy')}</CardTitle>
                      {summary.unpaid > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(summary.month)}
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">₹{summary.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Paid</p>
                        <p className="text-2xl font-bold text-green-600">₹{summary.paid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Unpaid</p>
                        <p className="text-2xl font-bold text-destructive">₹{summary.unpaid.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No monthly summary data available
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Collection Center Sale</DialogTitle>
          </DialogHeader>
          <CollectionCenterSalesForm
            onSubmit={handleAdd}
            isLoading={addSaleMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          <CollectionCenterSalesForm
            initialData={selectedSale}
            onSubmit={handleUpdate}
            isLoading={updateSaleMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
