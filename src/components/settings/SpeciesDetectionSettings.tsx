import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useToast } from '@/hooks/use-toast';

interface SpeciesThresholds {
  cow_max_fat: number;
  cow_max_snf: number;
  buffalo_min_fat: number;
  buffalo_min_snf: number;
}

export const SpeciesDetectionSettings = () => {
  const { toast } = useToast();
  const { value: thresholds, save, isLoading } = useAppSetting<SpeciesThresholds>('species_detection_thresholds');
  
  // Default thresholds if not set
  const defaultThresholds: SpeciesThresholds = {
    cow_max_fat: 5.0,
    cow_max_snf: 9.0,
    buffalo_min_fat: 5.5,
    buffalo_min_snf: 9.5
  };
  
  const currentThresholds = thresholds || defaultThresholds;
  
  const [formData, setFormData] = React.useState<SpeciesThresholds>(currentThresholds);
  
  React.useEffect(() => {
    setFormData(currentThresholds);
  }, [thresholds]);
  
  const handleSave = async () => {
    try {
      await save(formData);
      toast({
        title: "Settings saved",
        description: "Species detection thresholds have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save species detection settings.",
        variant: "destructive",
      });
    }
  };
  
  const handleInputChange = (field: keyof SpeciesThresholds, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData(prev => ({ ...prev, [field]: numValue }));
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Species Auto-Detection Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Configure fat and SNF percentage thresholds to automatically detect cow vs buffalo milk.
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Cow Milk Limits</h4>
            <div>
              <Label htmlFor="cow_max_fat">Maximum Fat % for Cow</Label>
              <Input
                id="cow_max_fat"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.cow_max_fat}
                onChange={(e) => handleInputChange('cow_max_fat', e.target.value)}
                placeholder="5.0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Milk above this fat % will be detected as buffalo
              </p>
            </div>
            
            <div>
              <Label htmlFor="cow_max_snf">Maximum SNF % for Cow</Label>
              <Input
                id="cow_max_snf"
                type="number"
                step="0.1"
                min="0"
                max="15"
                value={formData.cow_max_snf}
                onChange={(e) => handleInputChange('cow_max_snf', e.target.value)}
                placeholder="9.0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Milk above this SNF % will be detected as buffalo
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Buffalo Milk Minimums</h4>
            <div>
              <Label htmlFor="buffalo_min_fat">Minimum Fat % for Buffalo</Label>
              <Input
                id="buffalo_min_fat"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.buffalo_min_fat}
                onChange={(e) => handleInputChange('buffalo_min_fat', e.target.value)}
                placeholder="5.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Milk at or above this fat % will be detected as buffalo
              </p>
            </div>
            
            <div>
              <Label htmlFor="buffalo_min_snf">Minimum SNF % for Buffalo</Label>
              <Input
                id="buffalo_min_snf"
                type="number"
                step="0.1"
                min="0"
                max="15"
                value={formData.buffalo_min_snf}
                onChange={(e) => handleInputChange('buffalo_min_snf', e.target.value)}
                placeholder="9.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Milk at or above this SNF % will be detected as buffalo
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
        
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">Detection Logic:</p>
          <p>If Fat % ≥ {formData.buffalo_min_fat} OR SNF % ≥ {formData.buffalo_min_snf} → <span className="font-medium">Buffalo</span></p>
          <p>Otherwise → <span className="font-medium">Cow</span></p>
        </div>
      </CardContent>
    </Card>
  );
};