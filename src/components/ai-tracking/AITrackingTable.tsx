import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Edit, Baby, Heart } from 'lucide-react';
import { DeliveryWithCalfModal } from './DeliveryWithCalfModal';
import { useCalves } from '@/hooks/useCalves';
import { formatDate } from '@/lib/dateUtils';
import { useAppSetting } from '@/hooks/useAppSettings';

interface AITrackingTableProps {
  aiRecords: any[];
  isLoading: boolean;
  onUpdateRecord?: (id: string, updates: any) => void;
  onDeleteRecord?: (id: string) => void;
}

export const AITrackingTable: React.FC<AITrackingTableProps> = ({ 
  aiRecords, 
  isLoading, 
  onUpdateRecord,
  onDeleteRecord
}) => {
  const [pdDialog, setPdDialog] = useState<string | null>(null);
  const [deliveryDialog, setDeliveryDialog] = useState<string | null>(null);
  const [deliveryWithCalfDialog, setDeliveryWithCalfDialog] = useState<string | null>(null);
  const [pdResult, setPdResult] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [calfGender, setCalfGender] = useState('');
  
  const { createCalfFromDelivery } = useCalves();

  const pdAlert = useAppSetting<number>('pd_alert_days');
  const pdDays = typeof pdAlert.value === 'number' ? pdAlert.value : 60;

  if (isLoading) {
    return <div className="text-center py-4">Loading AI records...</div>;
  }

  if (!aiRecords || aiRecords.length === 0) {
    return <div className="text-center py-4">No AI records found.</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      done: 'secondary',
      pending: 'default',
      failed: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const handlePDUpdate = (recordId: string) => {
    onUpdateRecord?.(recordId, { 
      pd_done: true, 
      pd_result: pdResult,
      pd_date: new Date().toISOString().split('T')[0]
    });
    setPdDialog(null);
    setPdResult('');
  };

  const handleDeliveryUpdate = (recordId: string) => {
    onUpdateRecord?.(recordId, { 
      actual_delivery_date: deliveryDate,
      calf_gender: calfGender,
      is_successful: true
    });
    setDeliveryDialog(null);
    setDeliveryDate('');
    setCalfGender('');
  };

  const handleDeliveryWithCalf = (data: any) => {
    createCalfFromDelivery.mutate(data);
    setDeliveryWithCalfDialog(null);
  };

  const isDeliveryDue = (expectedDate: string | null) => {
    if (!expectedDate) return false;
    const deliveryDate = new Date(expectedDate);
    const today = new Date();
    const daysDiff = (deliveryDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 30; // Due within 30 days
  };

  const getPDDueDate = (aiDate: string) => {
    const due = new Date(aiDate);
    due.setDate(due.getDate() + pdDays);
    return formatDate(due);
  };

  const isPDDue = (aiDate: string) => {
    const due = new Date(aiDate);
    due.setDate(due.getDate() + pdDays);
    return new Date() >= due;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Cow Number</TableHead>
            <TableHead className="whitespace-nowrap">AI Date</TableHead>
            <TableHead className="whitespace-nowrap">Service #</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            <TableHead className="whitespace-nowrap">Expected Delivery</TableHead>
            <TableHead className="whitespace-nowrap">PD Due</TableHead>
            <TableHead className="whitespace-nowrap">PD Status</TableHead>
            <TableHead className="whitespace-nowrap">Delivery Status</TableHead>
            <TableHead className="whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aiRecords.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.cows?.cow_number || 'N/A'}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(record.ai_date)}</TableCell>
              <TableCell className="whitespace-nowrap">{record.service_number}</TableCell>
              <TableCell className="whitespace-nowrap">{getStatusBadge(record.ai_status)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {record.expected_delivery_date ? 
                  formatDate(record.expected_delivery_date) : 
                  'N/A'
                }
              </TableCell>
              <TableCell className="whitespace-nowrap">{getPDDueDate(record.ai_date)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {record.pd_done ? (
                    <Badge variant={record.pd_result === 'positive' ? 'default' : 'secondary'}>
                      {record.pd_result}
                    </Badge>
                  ) : (
                    <Badge variant={isPDDue(record.ai_date) ? 'destructive' : 'outline'}>
                      PD Due
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {record.actual_delivery_date ? (
                  <div className="flex flex-col gap-1">
                    <Badge variant="default">Delivered</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(record.actual_delivery_date)}
                    </span>
                    {record.calf_gender && (
                      <Badge variant="outline" className="w-fit">
                        {record.calf_gender}
                      </Badge>
                    )}
                  </div>
                ) : record.pd_result === 'positive' && isDeliveryDue(record.expected_delivery_date) ? (
                  <Badge variant="destructive">Due Soon</Badge>
                ) : record.pd_result === 'positive' ? (
                  <Badge variant="secondary">Pregnant</Badge>
                ) : (
                  <Badge variant="outline">Not Pregnant</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {!record.pd_done && isPDDue(record.ai_date) && (
                    <Dialog open={pdDialog === record.id} onOpenChange={(open) => setPdDialog(open ? record.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          PD Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Update Pregnancy Detection</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">PD Result</label>
                            <Select value={pdResult} onValueChange={setPdResult}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select result" />
                              </SelectTrigger>
                              <SelectContent className="bg-white z-50">
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={() => handlePDUpdate(record.id)} disabled={!pdResult}>
                            Update PD Status
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {record.pd_result === 'positive' && !record.actual_delivery_date && (
                    <>
                      <Dialog open={deliveryDialog === record.id} onOpenChange={(open) => setDeliveryDialog(open ? record.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="flex items-center gap-1">
                            <Baby className="h-3 w-3" />
                            Quick Delivery
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white">
                          <DialogHeader>
                            <DialogTitle>Quick Delivery Record</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Delivery Date</label>
                              <Input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Calf Gender</label>
                              <Select value={calfGender} onValueChange={setCalfGender}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-50">
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={() => handleDeliveryUpdate(record.id)} disabled={!deliveryDate || !calfGender}>
                              Record Delivery Only
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => setDeliveryWithCalfDialog(record.id)}
                      >
                        <Baby className="h-3 w-3" />
                        <Heart className="h-3 w-3" />
                        Delivery + Calf
                      </Button>
                    </>
                  )}

                  {record.pd_done && !record.actual_delivery_date && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => {
                        setDeliveryDialog(record.id);
                        setDeliveryDate('');
                        setCalfGender('');
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      Edit Status
                    </Button>
                  )}

                  {record.actual_delivery_date && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => {
                        setDeliveryDialog(record.id);
                        setDeliveryDate(record.actual_delivery_date || '');
                        setCalfGender(record.calf_gender || '');
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      Edit Delivery
                    </Button>
                  )}

                  {!record.pd_done && !isPDDue(record.ai_date) && (
                    <span className="text-sm text-muted-foreground px-2 py-1">
                      PD not due yet
                    </span>
                  )}
                  {onDeleteRecord && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Delete this AI record?')) onDeleteRecord(record.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Delivery with Calf Modal */}
      <DeliveryWithCalfModal
        open={deliveryWithCalfDialog !== null}
        onOpenChange={(open) => setDeliveryWithCalfDialog(open ? deliveryWithCalfDialog : null)}
        onSubmit={handleDeliveryWithCalf}
        isLoading={createCalfFromDelivery.isPending}
        record={aiRecords.find(r => r.id === deliveryWithCalfDialog)}
      />
    </>
  );
};