import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

interface CollectionCenterDistributionTableProps {
  distributions: any[];
  isLoading: boolean;
  onEdit: (distribution: any) => void;
  onDelete: (id: string) => void;
}

const CollectionCenterDistributionTable: React.FC<CollectionCenterDistributionTableProps> = ({
  distributions,
  isLoading,
  onEdit,
  onDelete
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!distributions || distributions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No distribution records found for this date.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>Cow→Store</TableHead>
          <TableHead>Cow→Plant</TableHead>
          <TableHead>Cow→Cream</TableHead>
          <TableHead>Buffalo→Store</TableHead>
          <TableHead>Buffalo→Plant</TableHead>
          <TableHead>Cash Sale</TableHead>
          <TableHead>Mixing</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {distributions.map((dist) => (
          <TableRow key={dist.id}>
            <TableCell>
              <Badge variant={dist.session === 'morning' ? 'default' : 'secondary'}>
                {dist.session}
              </Badge>
            </TableCell>
            <TableCell>{Number(dist.cow_to_store).toFixed(2)} L</TableCell>
            <TableCell>{Number(dist.cow_to_plant).toFixed(2)} L</TableCell>
            <TableCell>{Number(dist.cow_to_farm_cream).toFixed(2)} L</TableCell>
            <TableCell>{Number(dist.buffalo_to_store).toFixed(2)} L</TableCell>
            <TableCell>{Number(dist.buffalo_to_plant).toFixed(2)} L</TableCell>
            <TableCell>{Number(dist.cash_sale).toFixed(2)} L</TableCell>
            <TableCell>{Number(dist.mixing).toFixed(2)} L</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(dist)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(dist.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default CollectionCenterDistributionTable;
