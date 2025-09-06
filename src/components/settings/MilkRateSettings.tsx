import React, { useState } from 'react';
import { RateMatrixUploadModal } from './RateMatrixUploadModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { useAppSetting } from '@/hooks/useAppSettings';

export const MilkRateSettings = () => {
  const { value: modeSetting, save } = useAppSetting<{ mode: 'auto' | 'manual' }>('milk_rate_mode');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
              ? 'Rates will be calculated automatically using the uploaded rate matrix'
              : 'You can manually enter the total amount during milk collection'}
          </p>
        </CardContent>
      </Card>

      {/* Rate Matrix Upload */}
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

      <RateMatrixUploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen} 
      />
    </div>
  );
};
