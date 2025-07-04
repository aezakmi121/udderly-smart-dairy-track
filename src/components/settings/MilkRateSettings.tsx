
import React from 'react';
import { MilkRateForm } from './MilkRateForm';
import { MilkRateTable } from './MilkRateTable';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';

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
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Rate Settings</h3>
        </div>
        <div className="p-6">
          <MilkRateTable rateSettings={rateSettings || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
