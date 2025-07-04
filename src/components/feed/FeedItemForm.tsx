
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeedManagement } from '@/hooks/useFeedManagement';

interface FeedItemFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const FeedItemForm: React.FC<FeedItemFormProps> = ({ onSubmit, isLoading }) => {
  const { register, handleSubmit, setValue, reset } = useForm({
    defaultValues: {
      name: '',
      category_id: '',
      unit: '',
      cost_per_unit: '',
      minimum_stock_level: ''
    }
  });

  const { categories } = useFeedManagement();

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      cost_per_unit: data.cost_per_unit ? Number(data.cost_per_unit) : null,
      minimum_stock_level: Number(data.minimum_stock_level) || 0
    });
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Feed Item</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Item Name</Label>
            <Input
              {...register('name', { required: true })}
              placeholder="Feed item name"
            />
          </div>

          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select onValueChange={(value) => setValue('category_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="unit">Unit</Label>
            <Select onValueChange={(value) => setValue('unit', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                <SelectItem value="bags">Bags</SelectItem>
                <SelectItem value="tons">Tons</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="cost_per_unit">Cost per Unit (optional)</Label>
            <Input
              type="number"
              step="0.01"
              {...register('cost_per_unit')}
              placeholder="Cost per unit"
            />
          </div>

          <div>
            <Label htmlFor="minimum_stock_level">Minimum Stock Level</Label>
            <Input
              type="number"
              step="0.1"
              {...register('minimum_stock_level')}
              placeholder="Minimum stock level"
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Feed Item'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
