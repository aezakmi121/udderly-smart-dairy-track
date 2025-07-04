
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface MilkRateTableProps {
  rateSettings: any[];
  isLoading: boolean;
}

export const MilkRateTable: React.FC<MilkRateTableProps> = ({ rateSettings, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading rate settings...</div>;
  }

  if (!rateSettings || rateSettings.length === 0) {
    return <div className="text-center py-4">No rate settings found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fat Range</TableHead>
          <TableHead>SNF Range</TableHead>
          <TableHead>Rate per Liter</TableHead>
          <TableHead>Effective From</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rateSettings.map((setting) => (
          <TableRow key={setting.id}>
            <TableCell>{setting.fat_min}% - {setting.fat_max}%</TableCell>
            <TableCell>{setting.snf_min}% - {setting.snf_max}%</TableCell>
            <TableCell className="font-semibold">₹{setting.rate_per_liter}</TableCell>
            <TableCell>{format(new Date(setting.effective_from), 'MMM dd, yyyy')}</TableCell>
            <TableCell>
              <Badge variant={setting.is_active ? "default" : "secondary"}>
                {setting.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
