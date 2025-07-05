
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Tag, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

export const POSCategories = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Dairy Products',
      description: 'Milk, curd, cheese and other dairy items',
      product_count: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Snacks',
      description: 'Chips, biscuits, and other snack items',
      product_count: 12,
      created_at: new Date().toISOString(),
    }
  ]);
  const { toast } = useToast();

  const handleAddCategory = () => {
    toast({ title: "Category added successfully!" });
    setIsDialogOpen(false);
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category Name</Label>
                <Input placeholder="Enter category name" />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Enter category description" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCategory}>Save Category</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  {category.name}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline">
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline">
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
