
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface VaccinationTableProps {
  records: any[];
  isLoading: boolean;
}

export const VaccinationTable: React.FC<VaccinationTableProps> = ({ records, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading vaccination records...</div>;
  }

  if (!records || records.length === 0) {
    return <div className="text-center py-4">No vaccination records found.</div>;
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cow Number</TableHead>
          <TableHead>Vaccine</TableHead>
          <TableHead>Vaccination Date</TableHead>
          <TableHead>Next Due Date</TableHead>
          <TableHead>Batch Number</TableHead>
          <TableHead>Administered By</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell>{record.cows?.cow_number || 'N/A'}</TableCell>
            <TableCell>{record.vaccination_schedules?.vaccine_name || 'N/A'}</TableCell>
            <TableCell>{format(new Date(record.vaccination_date), 'MMM dd, yyyy')}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {format(new Date(record.next_due_date), 'MMM dd, yyyy')}
                {isOverdue(record.next_due_date) && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>{record.batch_number || 'N/A'}</TableCell>
            <TableCell>{record.administered_by || 'N/A'}</TableCell>
            <TableCell>
              <Badge variant={isOverdue(record.next_due_date) ? "destructive" : "secondary"}>
                {isOverdue(record.next_due_date) ? "Due" : "Current"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
