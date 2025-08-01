
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/dateUtils';

interface WeightLogTableProps {
  weightLogs: any[];
  isLoading: boolean;
}

export const WeightLogTable: React.FC<WeightLogTableProps> = ({ weightLogs, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading weight logs...</div>;
  }

  if (!weightLogs || weightLogs.length === 0) {
    return <div className="text-center py-4">No weight logs found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cow Number</TableHead>
          <TableHead>Log Date</TableHead>
          <TableHead>Heart Girth (cm)</TableHead>
          <TableHead>Body Length (cm)</TableHead>
          <TableHead>Calculated Weight (kg)</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {weightLogs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{log.cows?.cow_number || 'N/A'}</TableCell>
            <TableCell>{formatDate(log.log_date)}</TableCell>
            <TableCell>{log.heart_girth}</TableCell>
            <TableCell>{log.body_length}</TableCell>
            <TableCell className="font-semibold">{log.calculated_weight}</TableCell>
            <TableCell>{log.notes || 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
