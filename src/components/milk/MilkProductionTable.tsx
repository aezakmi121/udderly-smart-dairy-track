
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2 } from 'lucide-react';
import { MilkProductionTableSummary } from './MilkProductionTableSummary';

interface MilkProductionTableProps {
  milkRecords: any[];
  onEdit: (record: any) => void;
  onDelete: (id: string) => void;
  onAddSession?: (session: 'morning' | 'evening', cowId?: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  mode?: 'detailed' | 'summary';
}

export const MilkProductionTable: React.FC<MilkProductionTableProps> = ({
  milkRecords,
  onEdit,
  onDelete,
  onAddSession,
  canEdit = false,
  canDelete = false,
  mode = 'detailed'
}) => {
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>(mode);

  const DetailedTable = () => (
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

  return (
    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'detailed' | 'summary')}>
      <TabsList className="mb-4">
        <TabsTrigger value="summary">Summary View</TabsTrigger>
        <TabsTrigger value="detailed">Detailed View</TabsTrigger>
      </TabsList>
      
      <TabsContent value="summary">
        <MilkProductionTableSummary
          milkRecords={milkRecords}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSession={onAddSession}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </TabsContent>
      
      <TabsContent value="detailed">
        <DetailedTable />
      </TabsContent>
    </Tabs>
  );
};
