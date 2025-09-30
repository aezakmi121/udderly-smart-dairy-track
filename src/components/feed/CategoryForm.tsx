
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional()
});

interface CategoryFormProps {
  selectedCategory?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ selectedCategory, onSubmit, isLoading }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(categorySchema),
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
              {...register('name')}
              placeholder="Category name"
            />
            {errors.name?.message && <p className="text-sm text-destructive mt-1">{String(errors.name.message)}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              {...register('description')}
              placeholder="Category description"
            />
            {errors.description?.message && <p className="text-sm text-destructive mt-1">{String(errors.description.message)}</p>}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : selectedCategory ? 'Update Category' : 'Add Category'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
