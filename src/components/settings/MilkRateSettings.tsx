
import React, { useState } from 'react';
import { MilkRateForm } from './MilkRateForm';
import { MilkRateTable } from './MilkRateTable';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const MilkRateSettings = () => {
  const { rateSettings, isLoading, addRateSettingMutation } = useMilkRateSettings();
  const [isAutoCalculation, setIsAutoCalculation] = useState(true);

  const handleAddRateSetting = (data: any) => {
    addRateSettingMutation.mutate(data);
  };

  // Store the toggle state in localStorage so it persists across sessions
  React.useEffect(() => {
    const stored = localStorage.getItem('milkRateCalculationMode');
    if (stored) {
      setIsAutoCalculation(stored === 'auto');
    }
  }, []);

  const handleToggleChange = (checked: boolean) => {
    setIsAutoCalculation(checked);
    localStorage.setItem('milkRateCalculationMode', checked ? 'auto' : 'manual');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Calculation Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="calculation-mode"
              checked={isAutoCalculation}
              onCheckedChange={handleToggleChange}
            />
            <Label htmlFor="calculation-mode">
              {isAutoCalculation ? 'Automatic Rate Calculation' : 'Manual Rate Entry'}
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {isAutoCalculation 
              ? 'Rates will be calculated automatically using the rate settings below'
              : 'You can manually enter the total amount during milk collection'
            }
          </p>
        </CardContent>
      </Card>

      <MilkRateForm 
        onSubmit={handleAddRateSetting} 
        isLoading={addRateSettingMutation.isPending}
      />
      
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
