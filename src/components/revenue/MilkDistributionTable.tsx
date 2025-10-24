import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MilkDistributionTableProps {
  distributions: any[];
  isLoading: boolean;
  onEdit: (distribution: any) => void;
  onDelete: (id: string) => void;
}

export const MilkDistributionTable = ({ distributions, isLoading, onEdit, onDelete }: MilkDistributionTableProps) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!distributions || distributions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No distribution records for this date. Add your first distribution to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Calves</TableHead>
            <TableHead>Workers</TableHead>
            <TableHead>Home</TableHead>
            <TableHead>Pradhan Ji</TableHead>
            <TableHead>Chunnu</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>Cream</TableHead>
            <TableHead>Collection</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="font-semibold">{Number(dist.total_production).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.calves).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.farm_workers).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.home).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.pradhan_ji).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.chunnu).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.store).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.cream_extraction).toFixed(1)}L</TableCell>
              <TableCell>{Number(dist.collection_center).toFixed(1)}L</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(dist)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(dist.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
