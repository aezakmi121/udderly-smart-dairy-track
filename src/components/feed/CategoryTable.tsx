
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CategoryTableProps {
  categories: any[];
  isLoading: boolean;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({ categories, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading categories...</div>;
  }

  if (!categories || categories.length === 0) {
    return <div className="text-center py-4">No categories found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell>{category.description || '-'}</TableCell>
            <TableCell>
              {new Date(category.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
