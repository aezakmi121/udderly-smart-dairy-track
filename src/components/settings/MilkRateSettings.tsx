
import React from 'react';
import { MilkRateForm } from './MilkRateForm';
import { MilkRateTable } from './MilkRateTable';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const MilkRateSettings = () => {
  const { rateSettings, isLoading, addRateSettingMutation } = useMilkRateSettings();

  const handleAddRateSetting = (data: any) => {
    addRateSettingMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
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
