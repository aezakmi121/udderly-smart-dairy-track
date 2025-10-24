import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Droplet, Calendar } from 'lucide-react';
import { useMilkDistribution } from '@/hooks/useMilkDistribution';
import { MilkDistributionForm } from './MilkDistributionForm';
import { MilkDistributionTable } from './MilkDistributionTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const MilkDistributionManagement = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<any>(null);

  const { distributions, productionData, isLoading, addDistributionMutation, updateDistributionMutation, deleteDistributionMutation } = useMilkDistribution(selectedDate);

  const handleAdd = (data: any) => {
    addDistributionMutation.mutate({ ...data, distribution_date: selectedDate }, {
      onSuccess: () => setIsAddModalOpen(false)
    });
  };

  const handleEdit = (distribution: any) => {
    setSelectedDistribution(distribution);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (data: any) => {
    updateDistributionMutation.mutate({ id: selectedDistribution.id, ...data }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setSelectedDistribution(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this distribution record?')) {
      deleteDistributionMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Droplet className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Milk Distribution</h1>
      </div>

      <div className="space-y-6">
        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1 max-w-xs">
                <Label htmlFor="date">Distribution Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Morning Production</CardTitle>
              <Droplet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productionData?.morning.toFixed(1) || 0} L</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evening Production</CardTitle>
              <Droplet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productionData?.evening.toFixed(1) || 0} L</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Distribution Records</h3>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Distribution
          </Button>
        </div>

        {/* Distribution Table */}
        <MilkDistributionTable
          distributions={distributions || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Add Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Milk Distribution</DialogTitle>
            </DialogHeader>
            <MilkDistributionForm
              productionData={productionData}
              onSubmit={handleAdd}
              isLoading={addDistributionMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Milk Distribution</DialogTitle>
            </DialogHeader>
            <MilkDistributionForm
              initialData={selectedDistribution}
              productionData={productionData}
              onSubmit={handleUpdate}
              isLoading={updateDistributionMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
