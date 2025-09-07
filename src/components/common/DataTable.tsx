import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnConfig<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  className?: string;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export const DataTable = <T extends { id: string }>({
  data,
  columns,
  isLoading,
  onEdit,
  onDelete,
  emptyMessage = "No data found",
  className = ""
}: DataTableProps<T>) => {
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className={`rounded-md border ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  style={{ width: column.width }}
                  className={cn("whitespace-nowrap", column.className)}
                >
                  {column.label}
                </TableHead>
              ))}
              {(onEdit || onDelete) && (
                <TableHead className="w-[100px] whitespace-nowrap">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn("whitespace-nowrap", column.className)}>
                    {column.render 
                      ? column.render(row[column.key as keyof T], row)
                      : String(row[column.key as keyof T] || '-')
                    }
                  </TableCell>
                ))}
                {(onEdit || onDelete) && (
                  <TableCell className="whitespace-nowrap">
                    <div className="flex gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(row)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};