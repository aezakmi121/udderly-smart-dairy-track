
import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

interface MilkProductionTableProps {
  milkRecords: any[];
  onEdit: (record: any) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const MilkProductionTable: React.FC<MilkProductionTableProps> = ({
  milkRecords,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cow</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Fat %</TableHead>
            <TableHead>SNF %</TableHead>
            <TableHead>Remarks</TableHead>
            {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {milkRecords?.map((record: any) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">
                {record.cows?.cow_number || 'Bulk Entry'}
              </TableCell>
              <TableCell>
                <Badge variant={record.session === 'morning' ? 'default' : 'secondary'}>
                  {record.session}
                </Badge>
              </TableCell>
              <TableCell>{record.quantity} L</TableCell>
              <TableCell>{record.fat_percentage ? `${record.fat_percentage}%` : 'N/A'}</TableCell>
              <TableCell>{record.snf_percentage ? `${record.snf_percentage}%` : 'N/A'}</TableCell>
              <TableCell>{record.remarks || 'N/A'}</TableCell>
              {(canEdit || canDelete) && (
                <TableCell>
                  <div className="flex space-x-2">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(record)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this record?')) {
                            onDelete(record.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
