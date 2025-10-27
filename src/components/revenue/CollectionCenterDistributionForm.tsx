import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CollectionCenterDistributionFormProps {
  initialData?: any;
  collectionData?: Record<string, { cow: number; buffalo: number }>;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const CollectionCenterDistributionForm: React.FC<CollectionCenterDistributionFormProps> = ({
  initialData,
  collectionData,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      session: 'morning',
      cow_to_store: 0,
      cow_to_plant: 0,
      cow_to_farm_cream: 0,
      buffalo_to_store: 0,
      buffalo_to_plant: 0,
      cash_sale: 0,
      mixing: 0,
      notes: ''
    }
  });

  const session = watch('session');
  const cowToStore = Number(watch('cow_to_store') || 0);
  const cowToPlant = Number(watch('cow_to_plant') || 0);
  const cowToFarmCream = Number(watch('cow_to_farm_cream') || 0);
  const buffaloToStore = Number(watch('buffalo_to_store') || 0);
  const buffaloToPlant = Number(watch('buffalo_to_plant') || 0);
  const cashSale = Number(watch('cash_sale') || 0);
  const mixing = Number(watch('mixing') || 0);

  const availableCow = collectionData?.[session]?.cow || 0;
  const availableBuffalo = collectionData?.[session]?.buffalo || 0;

  const cowTotal = cowToStore + cowToPlant + cowToFarmCream;
  const buffaloTotal = buffaloToStore + buffaloToPlant;
  const cashAndMixing = cashSale + mixing;

  const cowRemaining = availableCow - cowTotal;
  const buffaloRemaining = availableBuffalo - buffaloTotal;
  const cashMixRemaining = availableCow - cashAndMixing;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Session</Label>
        <Select
          value={watch('session')}
          onValueChange={(value) => setValue('session', value)}
          disabled={!!initialData}
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

      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm font-medium">Available Cow Milk</p>
          <p className="text-2xl font-bold">{availableCow.toFixed(2)} L</p>
        </div>
        <div>
          <p className="text-sm font-medium">Available Buffalo Milk</p>
          <p className="text-2xl font-bold">{availableBuffalo.toFixed(2)} L</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Cow Milk Distribution</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>To Store (L)</Label>
            <Input type="number" step="0.01" {...register('cow_to_store')} />
          </div>
          <div>
            <Label>To Plant (Mixed) (L)</Label>
            <Input type="number" step="0.01" {...register('cow_to_plant')} />
          </div>
          <div>
            <Label>To Farm for Cream (L)</Label>
            <Input type="number" step="0.01" {...register('cow_to_farm_cream')} />
          </div>
        </div>

        <div className={`p-3 rounded ${cowRemaining < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
          <p className="text-sm font-medium">
            Cow Total: {cowTotal.toFixed(2)} L | Remaining: {cowRemaining.toFixed(2)} L
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Buffalo Milk Distribution</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>To Store (L)</Label>
            <Input type="number" step="0.01" {...register('buffalo_to_store')} />
          </div>
          <div>
            <Label>To Plant (L)</Label>
            <Input type="number" step="0.01" {...register('buffalo_to_plant')} />
          </div>
        </div>

        <div className={`p-3 rounded ${buffaloRemaining < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
          <p className="text-sm font-medium">
            Buffalo Total: {buffaloTotal.toFixed(2)} L | Remaining: {buffaloRemaining.toFixed(2)} L
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Cash Sale & Mixing (From Farmer #2 - Maharani Farm)</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cash Sale (L)</Label>
            <Input type="number" step="0.01" {...register('cash_sale')} />
          </div>
          <div>
            <Label>Mixing (with Buffalo) (L)</Label>
            <Input type="number" step="0.01" {...register('mixing')} />
          </div>
        </div>

        <div className={`p-3 rounded ${cashMixRemaining < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
          <p className="text-sm font-medium">
            Cash+Mix Total: {cashAndMixing.toFixed(2)} L | Available from Farm: {availableCow.toFixed(2)} L
          </p>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea {...register('notes')} />
      </div>

      <Button
        type="submit"
        disabled={isLoading || cowRemaining < 0 || buffaloRemaining < 0}
        className="w-full"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update Distribution' : 'Add Distribution'}
      </Button>
    </form>
  );
};

export default CollectionCenterDistributionForm;
