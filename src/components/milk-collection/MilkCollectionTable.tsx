import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Edit } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface MilkCollectionTableProps {
  collections: any[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (collection: any) => void;
  onDelete?: (id: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const MilkCollectionTable: React.FC<MilkCollectionTableProps> = ({ 
  collections, 
  isLoading, 
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectionChange
}) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading milk collections...</div>;
  }

  if (!collections || collections.length === 0) {
    return <div className="text-center py-4">No milk collections found.</div>;
  }

  const handleDelete = (id: string) => {
    if (onDelete && confirm('Are you sure you want to delete this collection record?')) {
      onDelete(id);
    }
  };

  const handleEdit = (collection: any) => {
    if (onEdit) {
      onEdit(collection);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange(collections.map(c => c.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
      }
    }
  };

  const allSelected = collections.length > 0 && selectedIds.length === collections.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < collections.length;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </TableHead>
            )}
            <TableHead className="whitespace-nowrap">Farmer</TableHead>
            <TableHead className="whitespace-nowrap">Date</TableHead>
            <TableHead className="whitespace-nowrap">Session</TableHead>
            <TableHead className="whitespace-nowrap">Quantity (L)</TableHead>
            <TableHead className="whitespace-nowrap">Fat %</TableHead>
            <TableHead className="whitespace-nowrap">SNF %</TableHead>
            <TableHead className="whitespace-nowrap">Rate</TableHead>
            <TableHead className="whitespace-nowrap">Total Amount</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            {(canEdit || canDelete) && <TableHead className="whitespace-nowrap">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((collection) => (
            <TableRow key={collection.id}>
              {onSelectionChange && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(collection.id)}
                    onCheckedChange={(checked) => handleSelectOne(collection.id, checked as boolean)}
                    aria-label={`Select ${collection.farmers?.name || 'collection'}`}
                  />
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap">
                <div>
                  <div className="font-medium">{collection.farmers?.name || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">
                    {collection.farmers?.farmer_code || 'N/A'}
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(collection.collection_date)}</TableCell>
              <TableCell className="capitalize whitespace-nowrap">
                <Badge variant={collection.session === 'morning' ? 'default' : 'secondary'}>
                  {collection.session}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">{collection.quantity}</TableCell>
              <TableCell className="whitespace-nowrap">{collection.fat_percentage}%</TableCell>
              <TableCell className="whitespace-nowrap">{collection.snf_percentage}%</TableCell>
              <TableCell className="whitespace-nowrap">₹{collection.rate_per_liter}</TableCell>
              <TableCell className="font-semibold whitespace-nowrap">₹{collection.total_amount}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge variant={collection.is_accepted ? "default" : "destructive"}>
                  {collection.is_accepted ? "Accepted" : "Rejected"}
                </Badge>
              </TableCell>
              {(canEdit || canDelete) && (
                <TableCell className="whitespace-nowrap">
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(collection)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(collection.id)}
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
