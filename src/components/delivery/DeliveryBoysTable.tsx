
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Eye } from 'lucide-react';

interface DeliveryBoy {
  id: string;
  user_id?: string;
  name: string;
  phone_number: string;
  vehicle_type?: string;
  vehicle_number?: string;
  assigned_area?: string;
  daily_capacity: number;
  is_active: boolean;
  created_at: string;
}

interface DeliveryBoysTableProps {
  deliveryBoys: DeliveryBoy[];
  onEdit: (deliveryBoy: DeliveryBoy) => void;
  canEdit: boolean;
}

export const DeliveryBoysTable: React.FC<DeliveryBoysTableProps> = ({
  deliveryBoys,
  onEdit,
  canEdit
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deliveryBoys?.map((deliveryBoy) => (
          <TableRow key={deliveryBoy.id}>
            <TableCell className="font-medium">{deliveryBoy.name}</TableCell>
            <TableCell>{deliveryBoy.phone_number}</TableCell>
            <TableCell>
              {deliveryBoy.vehicle_type && deliveryBoy.vehicle_number 
                ? `${deliveryBoy.vehicle_type} - ${deliveryBoy.vehicle_number}`
                : 'Not specified'
              }
            </TableCell>
            <TableCell>{deliveryBoy.assigned_area || 'Not assigned'}</TableCell>
            <TableCell>{deliveryBoy.daily_capacity}L</TableCell>
            <TableCell>
              <Badge variant={deliveryBoy.is_active ? 'default' : 'secondary'}>
                {deliveryBoy.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(deliveryBoy)}
                  disabled={!canEdit}
                >
                  {canEdit ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
