import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';

interface MilkDistributionFormProps {
  initialData?: any;
  productionData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const MilkDistributionForm = ({ initialData, productionData, onSubmit, isLoading }: MilkDistributionFormProps) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      session: 'morning',
      total_production: 0,
      calves: 0,
      farm_workers: 0,
      home: 0,
      pradhan_ji: 0,
      chunnu: 0,
      store: 0,
      cream_extraction: 0,
      collection_center: 0,
      cream_yield: 0,
      ffm_yield: 0,
      ffm_to_dahi: 0,
      ffm_to_plant: 0,
      notes: ''
    }
  });

  const session = watch('session');
  const totalProduction = watch('total_production');
  const calves = watch('calves') || 0;
  const farmWorkers = watch('farm_workers') || 0;
  const home = watch('home') || 0;
  const pradhanJi = watch('pradhan_ji') || 0;
  const chunnu = watch('chunnu') || 0;
  const store = watch('store') || 0;
  const creamExtraction = watch('cream_extraction') || 0;
  const collectionCenter = watch('collection_center') || 0;

  const totalDistributed = Number(calves) + Number(farmWorkers) + Number(home) + Number(pradhanJi) + 
    Number(chunnu) + Number(store) + Number(creamExtraction) + Number(collectionCenter);
  const remaining = Number(totalProduction) - totalDistributed;

  useEffect(() => {
    if (productionData && !initialData) {
      const production = session === 'morning' ? productionData.morning : productionData.evening;
      setValue('total_production', production);
    }
  }, [session, productionData, initialData, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="session">Session *</Label>
          <Select
            value={session}
            onValueChange={(value) => setValue('session', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_production">Total Production (L) *</Label>
          <Input
            id="total_production"
            type="number"
            step="0.1"
            {...register('total_production', { required: 'Total production is required', min: 0 })}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribution Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calves">Calves (L)</Label>
              <Input id="calves" type="number" step="0.1" {...register('calves', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm_workers">Farm Workers (L)</Label>
              <Input id="farm_workers" type="number" step="0.1" {...register('farm_workers', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home">Home (L)</Label>
              <Input id="home" type="number" step="0.1" {...register('home', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pradhan_ji">Pradhan Ji (L)</Label>
              <Input id="pradhan_ji" type="number" step="0.1" {...register('pradhan_ji', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chunnu">Chunnu (L)</Label>
              <Input id="chunnu" type="number" step="0.1" {...register('chunnu', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store">Store (L)</Label>
              <Input id="store" type="number" step="0.1" {...register('store', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cream_extraction">Cream Extraction (L)</Label>
              <Input id="cream_extraction" type="number" step="0.1" {...register('cream_extraction', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection_center">Collection Center (L)</Label>
              <Input id="collection_center" type="number" step="0.1" {...register('collection_center', { min: 0 })} />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Total Distributed:</span>
                <span className="ml-2 font-bold">{totalDistributed.toFixed(1)} L</span>
              </div>
              <div>
                <span className="text-sm font-medium">Remaining:</span>
                <span className={`ml-2 font-bold ${remaining < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {remaining.toFixed(1)} L
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cream Extraction Details (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cream_yield">Cream Yield (kg)</Label>
              <Input id="cream_yield" type="number" step="0.1" {...register('cream_yield', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ffm_yield">FFM Yield (L)</Label>
              <Input id="ffm_yield" type="number" step="0.1" {...register('ffm_yield', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ffm_to_dahi">FFM to Dahi (L)</Label>
              <Input id="ffm_to_dahi" type="number" step="0.1" {...register('ffm_to_dahi', { min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ffm_to_plant">FFM to Plant (L)</Label>
              <Input id="ffm_to_plant" type="number" step="0.1" {...register('ffm_to_plant', { min: 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Any additional notes..." rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || remaining < 0}>
          {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add Distribution'}
        </Button>
      </div>
    </form>
  );
};
