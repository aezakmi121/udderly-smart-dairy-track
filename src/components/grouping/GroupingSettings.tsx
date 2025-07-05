
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save } from 'lucide-react';
import { useCowGrouping } from '@/hooks/useCowGrouping';

export const GroupingSettings = () => {
  const { groupingSettings, updateSettingMutation, isLoading } = useCowGrouping();
  const [settings, setSettings] = useState<{[key: string]: any}>({});

  React.useEffect(() => {
    if (groupingSettings) {
      const settingsMap: {[key: string]: any} = {};
      groupingSettings.forEach(setting => {
        settingsMap[setting.setting_name] = setting.setting_value;
      });
      setSettings(settingsMap);
    }
  }, [groupingSettings]);

  const handleSaveSetting = async (settingName: string, value: any) => {
    await updateSettingMutation.mutateAsync({
      settingName,
      settingValue: value
    });
  };

  const handleYieldThresholdChange = (level: string, value: string) => {
    const currentThresholds = settings.yield_thresholds || {};
    const newThresholds = {
      ...currentThresholds,
      [level]: parseFloat(value) || 0
    };
    setSettings(prev => ({
      ...prev,
      yield_thresholds: newThresholds
    }));
  };

  const handleDaysInMilkThresholdChange = (level: string, value: string) => {
    const currentThresholds = settings.days_in_milk_thresholds || {};
    const newThresholds = {
      ...currentThresholds,
      [level]: parseInt(value) || 0
    };
    setSettings(prev => ({
      ...prev,
      days_in_milk_thresholds: newThresholds
    }));
  };

  const handleGroupingCriteriaChange = (field: string, value: string) => {
    const currentCriteria = settings.grouping_criteria || {};
    const newCriteria = {
      ...currentCriteria,
      [field]: value
    };
    setSettings(prev => ({
      ...prev,
      grouping_criteria: newCriteria
    }));
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automatic Grouping Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-grouping toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Automatic Grouping</Label>
              <p className="text-sm text-muted-foreground">
                Automatically suggest group assignments based on production metrics
              </p>
            </div>
            <Switch
              checked={settings.auto_grouping_enabled?.enabled || false}
              onCheckedChange={(checked) => {
                const newValue = { enabled: checked };
                setSettings(prev => ({ ...prev, auto_grouping_enabled: newValue }));
                handleSaveSetting('auto_grouping_enabled', newValue);
              }}
            />
          </div>

          {/* Grouping criteria */}
          <div className="space-y-4">
            <Label>Grouping Criteria Priority</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_criteria">Primary Criteria</Label>
                <Select
                  value={settings.grouping_criteria?.primary || 'yield'}
                  onValueChange={(value) => handleGroupingCriteriaChange('primary', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yield">Milk Yield</SelectItem>
                    <SelectItem value="days_in_milk">Days in Milk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="secondary_criteria">Secondary Criteria</Label>
                <Select
                  value={settings.grouping_criteria?.secondary || 'days_in_milk'}
                  onValueChange={(value) => handleGroupingCriteriaChange('secondary', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yield">Milk Yield</SelectItem>
                    <SelectItem value="days_in_milk">Days in Milk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => handleSaveSetting('grouping_criteria', settings.grouping_criteria)}
              disabled={updateSettingMutation.isPending}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Criteria
            </Button>
          </div>

          {/* Yield thresholds */}
          <div className="space-y-4">
            <Label>Milk Yield Thresholds (Liters per day)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="high_yield">High Producers (≥)</Label>
                <Input
                  id="high_yield"
                  type="number"
                  step="0.1"
                  value={settings.yield_thresholds?.high || ''}
                  onChange={(e) => handleYieldThresholdChange('high', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="medium_yield">Medium Producers (≥)</Label>
                <Input
                  id="medium_yield"
                  type="number"
                  step="0.1"
                  value={settings.yield_thresholds?.medium || ''}
                  onChange={(e) => handleYieldThresholdChange('medium', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="low_yield">Low Producers (&lt;)</Label>
                <Input
                  id="low_yield"
                  type="number"
                  step="0.1"
                  value={settings.yield_thresholds?.low || ''}
                  onChange={(e) => handleYieldThresholdChange('low', e.target.value)}
                  disabled
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
            <Button
              onClick={() => handleSaveSetting('yield_thresholds', settings.yield_thresholds)}
              disabled={updateSettingMutation.isPending}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Yield Thresholds
            </Button>
          </div>

          {/* Days in milk thresholds */}
          <div className="space-y-4">
            <Label>Days in Milk Thresholds</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="early_lactation">Early Lactation (&lt;)</Label>
                <Input
                  id="early_lactation"
                  type="number"
                  value={settings.days_in_milk_thresholds?.early || ''}
                  onChange={(e) => handleDaysInMilkThresholdChange('early', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mid_lactation">Mid Lactation (&lt;)</Label>
                <Input
                  id="mid_lactation"
                  type="number"
                  value={settings.days_in_milk_thresholds?.mid || ''}
                  onChange={(e) => handleDaysInMilkThresholdChange('mid', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="late_lactation">Late Lactation (≥)</Label>
                <Input
                  id="late_lactation"
                  type="number"
                  value={settings.days_in_milk_thresholds?.late || ''}
                  onChange={(e) => handleDaysInMilkThresholdChange('late', e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => handleSaveSetting('days_in_milk_thresholds', settings.days_in_milk_thresholds)}
              disabled={updateSettingMutation.isPending}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Days in Milk Thresholds
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Settings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Auto-grouping:</strong> {settings.auto_grouping_enabled?.enabled ? 'Enabled' : 'Disabled'}
            </div>
            <div>
              <strong>Primary criteria:</strong> {settings.grouping_criteria?.primary || 'yield'}
            </div>
            <div>
              <strong>Secondary criteria:</strong> {settings.grouping_criteria?.secondary || 'days_in_milk'}
            </div>
            <div>
              <strong>High yield threshold:</strong> {settings.yield_thresholds?.high || 20}L/day
            </div>
            <div>
              <strong>Medium yield threshold:</strong> {settings.yield_thresholds?.medium || 10}L/day
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
