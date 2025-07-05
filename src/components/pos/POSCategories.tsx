
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
  const { categories, categoryMutation, deleteCategoryMutation, products } = usePOSData();

  const openAddDialog = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    const productsInCategory = products?.filter(product => product.category === category.name) || [];
    
    if (productsInCategory.length > 0) {
      toast({ 
        title: "Cannot delete category", 
        description: `This category has ${productsInCategory.length} products. Please delete or move the products first.`,
        variant: "destructive" 
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.name);
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

      {/* Show products in each category for debugging */}
      {products && products.length > 0 && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Product Distribution:</h3>
          {categories?.map((category) => {
            const categoryProducts = products.filter(p => p.category === category.name);
            return (
              <div key={category.id} className="text-sm">
                <strong>{category.name}:</strong> {categoryProducts.length} products
                {categoryProducts.length > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    ({categoryProducts.map(p => p.name).join(', ')})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
