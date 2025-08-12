import React from 'react';
import { MilkRateForm } from './MilkRateForm';
import { MilkRateTable } from './MilkRateTable';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
            <Label htmlFor="calculation-mode">Rate calculation mode</Label>
            <RadioGroup
              id="calculation-mode"
              value={modeSetting?.mode ?? 'auto'}
              onValueChange={(val) => save({ mode: val as 'auto' | 'manual' })}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto">Automatic rate calculation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual rate entry</Label>
              </div>
            </RadioGroup>
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
