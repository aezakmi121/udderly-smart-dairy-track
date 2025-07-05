
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Truck, MapPin, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useDailyDeliveries } from '@/hooks/useDailyDeliveries';
import { useDeliveryBoys } from '@/hooks/useDeliveryBoys';

export const DeliveryBoyDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [actualQuantity, setActualQuantity] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [notes, setNotes] = useState('');

  const { deliveryBoys } = useDeliveryBoys();
  const currentUser = deliveryBoys.find(boy => boy.user_id); // This would be determined by auth
  const { deliveries, updateDelivery } = useDailyDeliveries(currentUser?.id, selectedDate);

  const handleUpdateDelivery = () => {
    if (editingDelivery && actualQuantity && deliveryStatus) {
      updateDelivery.mutate({
        deliveryId: editingDelivery.id,
        actualQuantity: parseFloat(actualQuantity),
        status: deliveryStatus,
        notes: notes
      });
      setEditingDelivery(null);
      setActualQuantity('');
      setDeliveryStatus('');
      setNotes('');
    }
  };

  const openEditDialog = (delivery: any) => {
    setEditingDelivery(delivery);
    setActualQuantity(delivery.actual_quantity?.toString() || delivery.scheduled_quantity?.toString() || '');
    setDeliveryStatus(delivery.status || 'pending');
    setNotes(delivery.notes || '');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'not_taken':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'not_taken':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const completedCount = deliveries.filter(d => d.status === 'delivered').length;
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const totalQuantity = deliveries.reduce((sum, d) => sum + (d.actual_quantity || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Delivery Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your daily milk deliveries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveries.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity}L</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{delivery.customers.name}</div>
                      <div className="text-sm text-muted-foreground">{delivery.customers.customer_code}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 max-w-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate text-sm">{delivery.customers.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{delivery.scheduled_quantity}L</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{delivery.actual_quantity || 0}L</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(delivery.status)}
                      <Badge variant="secondary" className={getStatusColor(delivery.status)}>
                        {delivery.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">₹{delivery.total_amount || 0}</div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(delivery)}
                        >
                          Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Delivery</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="quantity">Actual Quantity (L)</Label>
                            <Input
                              id="quantity"
                              type="number"
                              step="0.1"
                              value={actualQuantity}
                              onChange={(e) => setActualQuantity(e.target.value)}
                              placeholder="Enter delivered quantity"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="status">Delivery Status</Label>
                            <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="not_taken">Not Taken</SelectItem>
                                <SelectItem value="partial">Partial Delivery</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                              id="notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add any notes about the delivery..."
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setEditingDelivery(null)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleUpdateDelivery}
                              disabled={updateDelivery.isPending}
                            >
                              {updateDelivery.isPending ? 'Updating...' : 'Update Delivery'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {deliveries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No deliveries found for the selected date.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
