import React from 'react';
import { MilkRateForm } from './MilkRateForm';
import { MilkRateTable } from './MilkRateTable';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppSetting } from '@/hooks/useAppSettings';

export const MilkRateSettings = () => {
  const { rateSettings, isLoading, addRateSettingMutation } = useMilkRateSettings();
  const { value: modeSetting, save } = useAppSetting<{ mode: 'auto' | 'manual' }>('milk_rate_mode');

  const handleAddRateSetting = (data: any) => {
    addRateSettingMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Calculation Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Rate calculation mode</Label>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto"
                  checked={(modeSetting?.mode ?? 'auto') === 'auto'}
                  onCheckedChange={(checked) => checked && save({ mode: 'auto' })}
                />
                <Label htmlFor="auto">Automatic rate calculation</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="manual"
                  checked={(modeSetting?.mode ?? 'auto') === 'manual'}
                  onCheckedChange={(checked) => checked && save({ mode: 'manual' })}
                />
                <Label htmlFor="manual">Manual rate entry</Label>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {(modeSetting?.mode ?? 'auto') === 'auto'
              ? 'Rates will be calculated automatically using the rate settings below'
              : 'You can manually enter the total amount during milk collection'}
          </p>
        </CardContent>
      </Card>

      <MilkRateForm onSubmit={handleAddRateSetting} isLoading={addRateSettingMutation.isPending} />

      <Card>
        <CardHeader>
          <CardTitle>Current Rate Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <MilkRateTable rateSettings={rateSettings || []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
};
