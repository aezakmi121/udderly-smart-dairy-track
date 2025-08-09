
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryFormProps {
  selectedCategory?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ selectedCategory, onSubmit, isLoading }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: selectedCategory?.name || '',
      description: selectedCategory?.description || ''
    }
  });

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{selectedCategory ? 'Edit Category' : 'Add Feed Category'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              {...register('name', { required: true })}
              placeholder="Category name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              {...register('description')}
              placeholder="Category description"
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : selectedCategory ? 'Update Category' : 'Add Category'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
