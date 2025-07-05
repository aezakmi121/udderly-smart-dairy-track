
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Tag, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePOSData } from '@/hooks/usePOSData';

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
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const { toast } = useToast();
  const { categories, categoryMutation } = usePOSData();

  const openAddDialog = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description);
    setIsDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }

    const categoryData = {
      name: categoryName,
      description: categoryDescription,
      product_count: editingCategory?.product_count || 0
    };

    categoryMutation.mutate({
      categoryData,
      isUpdate: !!editingCategory,
      id: editingCategory?.id
    });

    setIsDialogOpen(false);
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
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
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCategory}>
                  {editingCategory ? 'Update' : 'Save'} Category
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  {category.name}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(category)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
              <div className="text-sm">
                <span className="font-medium">{category.product_count}</span> products
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
