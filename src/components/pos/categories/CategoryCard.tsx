
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Edit2, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onEdit,
  onDelete
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {category.name}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onEdit(category)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onDelete(category)}
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
  );
};
