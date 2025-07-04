
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const isPDDue = (aiDate: string) => {
    const pdDate = new Date(aiDate);
    pdDate.setMonth(pdDate.getMonth() + 2); // PD typically done 2 months after AI
    return new Date() >= pdDate;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cow Number</TableHead>
          <TableHead>AI Date</TableHead>
          <TableHead>Service #</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expected Delivery</TableHead>
          <TableHead>PD Status</TableHead>
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
              {!record.pd_done && isPDDue(record.ai_date) && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onUpdateRecord?.(record.id, { pd_done: true, pd_result: 'pending' })}
                >
                  Mark PD Done
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
