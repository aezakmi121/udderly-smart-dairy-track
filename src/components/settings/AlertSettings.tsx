import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useToast } from '@/hooks/use-toast';

export const AlertSettings: React.FC = () => {
  const { toast } = useToast();

  // Settings hooks
  const pdAlert = useAppSetting<number>('pd_alert_days');
  const deliveryAlert = useAppSetting<number>('delivery_expected_days');

  // Local editable state
  const [pdDays, setPdDays] = useState<number>(60);
  const [deliveryDays, setDeliveryDays] = useState<number>(283);

  useEffect(() => {
    if (typeof pdAlert.value === 'number') setPdDays(pdAlert.value);
    if (typeof deliveryAlert.value === 'number') setDeliveryDays(deliveryAlert.value);
  }, [pdAlert.value, deliveryAlert.value]);

  const savePdDays = async () => {
    await pdAlert.saveAsync(pdDays as any);
    toast({ title: 'PD alert days updated' });
  };

  const saveDeliveryDays = async () => {
    await deliveryAlert.saveAsync(deliveryDays as any);
    toast({ title: 'Expected delivery days updated' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="pd-days">PD alert after (days from AI)</Label>
        <div className="flex gap-3 items-center">
          <Input
            id="pd-days"
            type="number"
            min={1}
            value={pdDays}
            onChange={(e) => setPdDays(Number(e.target.value))}
            className="w-32"
          />
          <Button type="button" onClick={savePdDays} disabled={pdAlert.isSaving}>
            {pdAlert.isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Default is 60 days. Controls when PD-due notifications appear.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery-days">Expected delivery (days from AI)</Label>
        <div className="flex gap-3 items-center">
          <Input
            id="delivery-days"
            type="number"
            min={1}
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(Number(e.target.value))}
            className="w-32"
          />
          <Button type="button" onClick={saveDeliveryDays} disabled={deliveryAlert.isSaving}>
            {deliveryAlert.isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Default is 283 days. Used for delivery-due notifications if no date is set.</p>
      </div>
    </div>
  );
};
