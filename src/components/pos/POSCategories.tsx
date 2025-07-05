
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePOSData } from '@/hooks/usePOSData';
import { CategoryCard } from './categories/CategoryCard';
import { CategoryForm } from './categories/CategoryForm';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

export const POSCategories = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const { categories, categoryMutation } = usePOSData();

  const openAddDialog = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    if (category.product_count > 0) {
      toast({ 
        title: "Cannot delete category", 
        description: "This category has products assigned to it.",
        variant: "destructive" 
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      toast({ title: "Category deleted successfully!" });
    }
  };

  const handleSaveCategory = (categoryData: { name: string; description: string }) => {
    const data = {
      ...categoryData,
      product_count: editingCategory?.product_count || 0
    };

    categoryMutation.mutate({
      categoryData: data,
      isUpdate: !!editingCategory,
      id: editingCategory?.id
    });

    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-muted-foreground">Organize your products into categories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            <CategoryForm
              category={editingCategory}
              onSave={handleSaveCategory}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={openEditDialog}
            onDelete={handleDeleteCategory}
          />
        ))}
      </div>
    </div>
  );
};
