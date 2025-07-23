
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Edit, Baby } from 'lucide-react';
import { format } from 'date-fns';

interface AITrackingTableProps {
  aiRecords: any[];
  isLoading: boolean;
  onUpdateRecord?: (id: string, updates: any) => void;
}

export const AITrackingTable: React.FC<AITrackingTableProps> = ({ 
  aiRecords, 
  isLoading, 
  onUpdateRecord 
}) => {
  const [pdDialog, setPdDialog] = useState<string | null>(null);
  const [deliveryDialog, setDeliveryDialog] = useState<string | null>(null);
  const [pdResult, setPdResult] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [calfGender, setCalfGender] = useState('');
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

  const isDeliveryDue = (expectedDate: string | null) => {
    if (!expectedDate) return false;
    const deliveryDate = new Date(expectedDate);
    const today = new Date();
    const daysDiff = (deliveryDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 30; // Due within 30 days
  };

  const isPDDue = (aiDate: string) => {
    const pdDate = new Date(aiDate);
    pdDate.setMonth(pdDate.getMonth() + 2); // PD typically done 2 months after AI
    return new Date() >= pdDate;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cow Number</TableHead>
            <TableHead>AI Date</TableHead>
            <TableHead>Service #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expected Delivery</TableHead>
            <TableHead>PD Status</TableHead>
            <TableHead>Delivery Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aiRecords.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.cows?.cow_number || 'N/A'}</TableCell>
              <TableCell>{format(new Date(record.ai_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{record.service_number}</TableCell>
              <TableCell>{getStatusBadge(record.ai_status)}</TableCell>
              <TableCell>
                {record.expected_delivery_date ? 
                  format(new Date(record.expected_delivery_date), 'MMM dd, yyyy') : 
                  'N/A'
                }
              </TableCell>
              <TableCell>
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
                      {format(new Date(record.actual_delivery_date), 'MMM dd, yyyy')}
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
                <div className="flex flex-col gap-2">
                  {!record.pd_done && isPDDue(record.ai_date) && (
                    <Dialog open={pdDialog === record.id} onOpenChange={(open) => setPdDialog(open ? record.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          PD Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
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
                              <SelectContent>
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
                    <Dialog open={deliveryDialog === record.id} onOpenChange={(open) => setDeliveryDialog(open ? record.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Baby className="h-3 w-3" />
                          Record Delivery
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Delivery</DialogTitle>
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
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={() => handleDeliveryUpdate(record.id)} disabled={!deliveryDate || !calfGender}>
                            Record Delivery
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};
