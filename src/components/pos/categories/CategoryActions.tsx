
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

interface CategoryActionsProps {
  category: Category;
  productsInCategory: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export const CategoryActions: React.FC<CategoryActionsProps> = ({
  category,
  productsInCategory,
  onEdit,
  onDelete
}) => {
  const { toast } = useToast();

  const handleDelete = () => {
    if (productsInCategory > 0) {
      toast({ 
        title: "Cannot delete category", 
        description: `This category has ${productsInCategory} products. Please delete or move the products first.`,
        variant: "destructive" 
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      onDelete(category);
    }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => onEdit(category)}>
        <Edit2 className="h-3 w-3" />
      </Button>
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleDelete}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
