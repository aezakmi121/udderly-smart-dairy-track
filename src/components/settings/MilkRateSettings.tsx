import React, { useState } from 'react';
import { MilkRateForm } from './MilkRateForm';
import { MilkRateTable } from './MilkRateTable';
import { RateMatrixUploadModal } from './RateMatrixUploadModal';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { useAppSetting } from '@/hooks/useAppSettings';

export const MilkRateSettings = () => {
  const { rateSettings, isLoading, addRateSettingMutation } = useMilkRateSettings();
  const { value: modeSetting, save } = useAppSetting<{ mode: 'auto' | 'manual' }>('milk_rate_mode');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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

      {/* Excel Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Rate Matrix Upload
            <Button 
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Upload Excel Rate Matrix
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Upload monthly Excel files with Buffalo and Cow rate charts. Each tab should contain Fat-SNF matrix with dynamic bounds.
          </div>
        </CardContent>
      </Card>

      {/* Legacy Single Rate Form */}
      <MilkRateForm onSubmit={handleAddRateSetting} isLoading={addRateSettingMutation.isPending} />

      <Card>
        <CardHeader>
          <CardTitle>Current Rate Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <MilkRateTable rateSettings={rateSettings || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <RateMatrixUploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen} 
      />
    </div>
  );
};
