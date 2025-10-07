import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ColumnConfig<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  className?: string;
  mobileHidden?: boolean; // Hide on mobile
  mobilePrimary?: boolean; // Show as primary on mobile cards
}

export interface CustomAction<T = any> {
  label: string;
  icon: React.ReactNode;
  onClick: (row: T) => void;
  className?: string;
  show?: (row: T) => boolean;
}

interface MobileDataTableProps<T = any> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  customActions?: CustomAction<T>[];
  emptyMessage?: string;
  className?: string;
  mobileCardView?: boolean; // Force card view on mobile
}

export const MobileDataTable = <T extends { id: string }>({
  data,
  columns,
  isLoading,
  onEdit,
  onDelete,
  customActions = [],
  emptyMessage = "No data found",
  className = "",
  mobileCardView = true
}: MobileDataTableProps<T>) => {
  const isMobile = useIsMobile();

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

  // Mobile card view
  if (isMobile && mobileCardView) {
    const primaryColumns = columns.filter(col => col.mobilePrimary);
    const secondaryColumns = columns.filter(col => !col.mobilePrimary && !col.mobileHidden);

    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((row) => (
          <Card key={row.id} className="p-3">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  {/* Primary columns - prominently displayed */}
                  {primaryColumns.map((column) => (
                    <div key={column.key} className="font-medium">
                      {column.render
                        ? column.render(row[column.key as keyof T], row)
                        : String(row[column.key as keyof T] || '-')
                      }
                    </div>
                  ))}
                  
                  {/* Secondary columns - smaller text */}
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {secondaryColumns.map((column) => (
                      <div key={column.key} className="flex items-center gap-1">
                        <span className="font-medium">{column.label}:</span>
                        <span>
                          {column.render
                            ? column.render(row[column.key as keyof T], row)
                            : String(row[column.key as keyof T] || '-')
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions dropdown for mobile */}
                {(onEdit || onDelete || customActions.length > 0) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {customActions.map((action, index) => {
                        if (action.show && !action.show(row)) return null;
                        return (
                          <DropdownMenuItem 
                            key={index} 
                            onClick={() => action.onClick(row)}
                            className={action.className}
                          >
                            {action.icon}
                            {action.label}
                          </DropdownMenuItem>
                        );
                      })}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem onClick={() => onDelete(row)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  const visibleColumns = columns.filter(col => !col.mobileHidden || !isMobile);

  return (
    <div className="overflow-x-auto">
      <div className={`rounded-md border ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.key} 
                  style={{ width: column.width }}
                  className={cn("whitespace-nowrap", column.className)}
                >
                  {column.label}
                </TableHead>
              ))}
              {(onEdit || onDelete || customActions.length > 0) && (
                <TableHead className="w-[100px] whitespace-nowrap">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                {visibleColumns.map((column) => (
                  <TableCell key={column.key} className={cn("whitespace-nowrap", column.className)}>
                    {column.render 
                      ? column.render(row[column.key as keyof T], row)
                      : String(row[column.key as keyof T] || '-')
                    }
                  </TableCell>
                ))}
                {(onEdit || onDelete || customActions.length > 0) && (
                  <TableCell className="whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {customActions.map((action, index) => {
                          if (action.show && !action.show(row)) return null;
                          return (
                            <DropdownMenuItem 
                              key={index} 
                              onClick={() => action.onClick(row)}
                              className={action.className}
                            >
                              {action.icon}
                              {action.label}
                            </DropdownMenuItem>
                          );
                        })}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(row)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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