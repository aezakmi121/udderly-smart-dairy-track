
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface DeliveryBoyFormProps {
  selectedDeliveryBoy: DeliveryBoy | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const DeliveryBoyForm: React.FC<DeliveryBoyFormProps> = ({
  selectedDeliveryBoy,
  onSubmit,
  onCancel,
  isLoading
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={selectedDeliveryBoy?.name || ''}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone_number">Phone Number *</Label>
        <Input
          id="phone_number"
          name="phone_number"
          defaultValue={selectedDeliveryBoy?.phone_number || ''}
          required
        />
      </div>

      <div>
        <Label htmlFor="vehicle_type">Vehicle Type</Label>
        <Select name="vehicle_type" defaultValue={selectedDeliveryBoy?.vehicle_type || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Select vehicle type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bike">Bike</SelectItem>
            <SelectItem value="scooter">Scooter</SelectItem>
            <SelectItem value="car">Car</SelectItem>
            <SelectItem value="van">Van</SelectItem>
            <SelectItem value="truck">Truck</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="vehicle_number">Vehicle Number</Label>
        <Input
          id="vehicle_number"
          name="vehicle_number"
          defaultValue={selectedDeliveryBoy?.vehicle_number || ''}
        />
      </div>

      <div>
        <Label htmlFor="assigned_area">Assigned Area</Label>
        <Input
          id="assigned_area"
          name="assigned_area"
          defaultValue={selectedDeliveryBoy?.assigned_area || ''}
        />
      </div>

      <div>
        <Label htmlFor="daily_capacity">Daily Capacity (Liters)</Label>
        <Input
          id="daily_capacity"
          name="daily_capacity"
          type="number"
          step="0.1"
          defaultValue={selectedDeliveryBoy?.daily_capacity || ''}
        />
      </div>

      <div>
        <Label htmlFor="is_active">Status</Label>
        <Select name="is_active" defaultValue={selectedDeliveryBoy?.is_active?.toString() || 'true'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (selectedDeliveryBoy ? 'Update' : 'Add')}
        </Button>
      </div>
    </form>
  );
};
