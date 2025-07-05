
import React from 'react';
import { CategoryCard } from './CategoryCard';
import { CategoryActions } from './CategoryActions';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

interface CategoryWithActionsProps {
  category: Category;
  productsInCategory: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export const CategoryWithActions: React.FC<CategoryWithActionsProps> = ({
  category,
  productsInCategory,
  onEdit,
  onDelete
}) => {
  return (
    <div className="relative group">
      <CategoryCard category={category} />
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <CategoryActions
          category={category}
          productsInCategory={productsInCategory}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};
