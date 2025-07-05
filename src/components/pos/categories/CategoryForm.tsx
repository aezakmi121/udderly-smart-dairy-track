
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

interface CategoryFormProps {
  category: Category | null;
  onSave: (categoryData: { name: string; description: string }) => void;
  onCancel: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onSave,
  onCancel
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (category) {
      setCategoryName(category.name);
      setCategoryDescription(category.description);
    } else {
      setCategoryName('');
      setCategoryDescription('');
    }
  }, [category]);

  const handleSubmit = () => {
    if (!categoryName.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }

    onSave({
      name: categoryName,
      description: categoryDescription
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Category Name *</Label>
        <Input 
          placeholder="Enter category name" 
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
      </div>
      <div>
        <Label>Description</Label>
        <Input 
          placeholder="Enter category description" 
          value={categoryDescription}
          onChange={(e) => setCategoryDescription(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {category ? 'Update' : 'Save'} Category
        </Button>
      </div>
    </div>
  );
};
