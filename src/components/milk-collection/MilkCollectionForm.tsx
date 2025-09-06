
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMilkCollection } from '@/hooks/useMilkCollection';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';
import { useRateMatrix } from '@/hooks/useRateMatrix';
import { useAppSetting } from '@/hooks/useAppSettings';
import { Badge } from '@/components/ui/badge';

interface MilkCollectionFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  initialData?: any;
  selectedDate: string;
  selectedSession: 'morning' | 'evening';
}

export const MilkCollectionForm: React.FC<MilkCollectionFormProps> = ({ onSubmit, isLoading, initialData, selectedDate, selectedSession }) => {
  
  
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: initialData ? {
      farmer_id: initialData.farmer_id || '',
      species: initialData.species || 'Cow',
      collection_date: initialData.collection_date || selectedDate,
      session: initialData.session || selectedSession,
      quantity: initialData.quantity?.toString() || '',
      fat_percentage: initialData.fat_percentage?.toString() || '',
      snf_percentage: initialData.snf_percentage?.toString() || '',
      total_amount: initialData.total_amount?.toString() || '',
      is_accepted: initialData.is_accepted ?? true,
      remarks: initialData.remarks || ''
    } : {
      farmer_id: '',
      species: 'Cow',
      collection_date: selectedDate,
      session: selectedSession,
      quantity: '',
      fat_percentage: '',
      snf_percentage: '',
      total_amount: '',
      is_accepted: true,
      remarks: ''
    }
  });

  const { farmers } = useMilkCollection();
  const { calculateRate } = useMilkRateSettings();
  const { getRateQuery } = useRateMatrix();
  
  const quantity = watch('quantity');
  const fatPercentage = watch('fat_percentage');
  const snfPercentage = watch('snf_percentage');
  const manualAmount = watch('total_amount');
  const collectionDate = watch('collection_date');
  const species = watch('species');

  // Get species detection thresholds from settings
  const { value: thresholds } = useAppSetting<{
    cow_max_fat: number;
    cow_max_snf: number;
    buffalo_min_fat: number;
    buffalo_min_snf: number;
  }>('species_detection_thresholds');

  // Default thresholds if not configured
  const defaultThresholds = {
    cow_max_fat: 5.0,
    cow_max_snf: 9.0,
    buffalo_min_fat: 5.5,
    buffalo_min_snf: 9.5
  };
  
  const currentThresholds = thresholds || defaultThresholds;

  // Auto-detect species based on configurable fat and SNF thresholds
  React.useEffect(() => {
    const fat = Number(fatPercentage) || 0;
    const snf = Number(snfPercentage) || 0;
    
    if (fat > 0 && snf > 0) {
      // Check if fat or SNF meets buffalo criteria
      const detectedSpecies = (fat >= currentThresholds.buffalo_min_fat || snf >= currentThresholds.buffalo_min_snf) 
        ? 'Buffalo' 
        : 'Cow';
      setValue('species', detectedSpecies);
    }
  }, [fatPercentage, snfPercentage, setValue, currentThresholds]);

  // Try matrix-based rate calculation first, fallback to legacy
  const matrixRateQuery = getRateQuery(
    species || 'Cow',
    Number(fatPercentage) || 0,
    Number(snfPercentage) || 0,
    collectionDate
  );

  const legacyRate = calculateRate(Number(fatPercentage) || 0, Number(snfPercentage) || 0);
  const matrixRate = matrixRateQuery.data?.rate || 0;
  const effectiveFrom = matrixRateQuery.data?.effective_from;
  
  // Use matrix rate if available, otherwise fallback to legacy
  const calculatedRate = matrixRate > 0 ? matrixRate : legacyRate;
  const hasMatrixRate = matrixRate > 0;
  const isRateLoading = matrixRateQuery.isLoading;

  const { value: modeSetting } = useAppSetting<{ mode: 'auto' | 'manual' }>('milk_rate_mode');
  const isAuto = (modeSetting?.mode ?? 'auto') === 'auto';
  const totalAmount = isAuto 
    ? (Number(quantity) || 0) * calculatedRate
    : Number(manualAmount) || 0;
  const derivedRate = isAuto 
    ? calculatedRate 
    : (Number(quantity) > 0 ? totalAmount / Number(quantity) : 0);


  React.useEffect(() => {
    // keep form values in sync with selected date/session when adding new
    if (!initialData) {
      setValue('collection_date', selectedDate);
      setValue('session', selectedSession);
    }
  }, [initialData, selectedDate, selectedSession, setValue]);

  const handleFormSubmit = (data: any) => {
    const submitData = {
      ...data,
      quantity: Number(data.quantity),
      fat_percentage: Number(data.fat_percentage),
      snf_percentage: Number(data.snf_percentage),
      rate_per_liter: derivedRate,
      total_amount: totalAmount
    };
    
    if (initialData) {
      submitData.id = initialData.id;
    }
    
    onSubmit(submitData);
    if (!initialData) {
      reset();
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Record Milk Collection</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="farmer_id">Farmer</Label>
            <Select onValueChange={(value) => setValue('farmer_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a farmer" />
              </SelectTrigger>
              <SelectContent>
                {farmers?.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.name} ({farmer.farmer_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAuto && (
            <div>
              <Label htmlFor="species">Species</Label>
              <div className="mt-2 text-sm font-medium">
                {watch('species')}
              </div>
              {/* Hidden input to submit value */}
              <input type="hidden" {...register('species')} />
            </div>
          )}

          <div>
            <Label htmlFor="collection_date">Collection Date</Label>
            <Input
              type="date"
              value={watch('collection_date')}
              disabled
            />
            {/* Hidden input to submit value */}
            <input type="hidden" {...register('collection_date')} />
          </div>

          <div>
            <Label>Session</Label>
            <div className="mt-2 text-sm font-medium">
              {watch('session') === 'morning' ? 'Morning' : 'Evening'}
            </div>
            {/* Hidden input to submit value */}
            <input type="hidden" {...register('session')} />
          </div>

          <div>
            <Label htmlFor="quantity">Quantity (Liters)</Label>
            <Input
              type="number"
              step="0.001"
              {...register('quantity', { required: true })}
              placeholder="Milk quantity"
            />
          </div>

          <div>
            <Label htmlFor="fat_percentage">Fat %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('fat_percentage', { required: true })}
              placeholder="Fat percentage"
            />
            <p className="text-xs text-muted-foreground mt-1">For record keeping only</p>
          </div>

          <div>
            <Label htmlFor="snf_percentage">SNF %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('snf_percentage', { required: true })}
              placeholder="SNF percentage"
            />
            <p className="text-xs text-muted-foreground mt-1">For record keeping only</p>
          </div>

          {isAuto ? (
            <>
              <div>
                <Label>Rate per Liter</Label>
                {isRateLoading ? (
                  <div className="text-lg font-medium text-muted-foreground">
                    Loading rate...
                  </div>
                ) : (
                  <div className="text-lg font-medium text-blue-600">
                    ₹{calculatedRate.toFixed(2)}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {hasMatrixRate && effectiveFrom && (
                    <Badge variant="secondary" className="text-xs">
                      Matrix rate ≤ {effectiveFrom}
                    </Badge>
                  )}
                  {!hasMatrixRate && calculatedRate > 0 && !isRateLoading && (
                    <Badge variant="outline" className="text-xs">
                      Legacy rate
                    </Badge>
                  )}
                  {!hasMatrixRate && calculatedRate === 0 && !isRateLoading && (
                    <Badge variant="destructive" className="text-xs">
                      No rates available
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label>Total Amount</Label>
                <div className="text-lg font-semibold text-green-600">
                  ₹{totalAmount.toFixed(2)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="total_amount">Total Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('total_amount', { required: true })}
                  placeholder="Enter total amount"
                />
              </div>

              <div>
                <Label>Calculated Rate</Label>
                <div className="text-lg font-medium text-blue-600">
                  ₹{derivedRate.toFixed(2)}/L
                </div>
                <p className="text-xs text-muted-foreground">Rate = Amount ÷ Quantity</p>
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea {...register('remarks')} placeholder="Additional remarks" />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (initialData ? 'Updating...' : 'Recording...') : (initialData ? 'Update Collection' : 'Record Collection')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
