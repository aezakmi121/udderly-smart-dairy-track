import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, MoreHorizontal, Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ColumnConfig<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  className?: string;
  mobileHidden?: boolean;
  mobilePrimary?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

interface EnhancedMobileDataTableProps<T = any> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  searchable?: boolean;
  filterable?: boolean;
  title?: string;
  description?: string;
}

export const EnhancedMobileDataTable = <T extends { id: string }>({
  data,
  columns,
  isLoading,
  onEdit,
  onDelete,
  emptyMessage = "No data found",
  className = "",
  searchable = false,
  filterable = false,
  title,
  description
}: EnhancedMobileDataTableProps<T>) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  // Filter and search data
  const filteredData = React.useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm && searchable) {
      result = result.filter(row => 
        columns.some(column => 
          String(row[column.key as keyof T] || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filter
    if (filterColumn && filterValue) {
      result = result.filter(row => 
        String(row[filterColumn as keyof T] || '')
          .toLowerCase()
          .includes(filterValue.toLowerCase())
      );
    }

    // Apply sort
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn as keyof T];
        const bValue = b[sortColumn as keyof T];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection, filterColumn, filterValue, columns, searchable]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {title && (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            {description && <Skeleton className="h-4 w-64" />}
          </div>
        )}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={isMobile ? "h-20 w-full" : "h-12 w-full"} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className={cn(
              "font-semibold tracking-tight",
              isMobile ? "text-lg" : "text-xl"
            )}>
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Controls */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          {filterable && (
            <div className="flex gap-2">
              <Select value={filterColumn} onValueChange={setFilterColumn}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent>
                  {columns.filter(col => col.filterable).map(column => (
                    <SelectItem key={column.key} value={column.key}>
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {filterColumn && (
                <Input
                  placeholder="Filter value..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-32"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Data Display */}
      {!filteredData || filteredData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Filter className="h-8 w-8 opacity-50" />
            <p>{emptyMessage}</p>
            {(searchTerm || filterValue) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterValue('');
                  setFilterColumn('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      ) : isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {filteredData.map((row) => {
            const primaryColumns = columns.filter(col => col.mobilePrimary);
            const secondaryColumns = columns.filter(col => !col.mobilePrimary && !col.mobileHidden);
            
            return (
              <Card key={row.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      {/* Primary Info */}
                      {primaryColumns.map((column) => (
                        <div key={column.key} className="font-medium text-base">
                          {column.render
                            ? column.render(row[column.key as keyof T], row)
                            : String(row[column.key as keyof T] || '-')
                          }
                        </div>
                      ))}
                      
                      {/* Secondary Info */}
                      {secondaryColumns.length > 0 && (
                        <div className="grid grid-cols-1 gap-2">
                          {secondaryColumns.map((column) => (
                            <div key={column.key} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-medium">
                                {column.label}:
                              </span>
                              <span className="font-medium">
                                {column.render
                                  ? column.render(row[column.key as keyof T], row)
                                  : String(row[column.key as keyof T] || '-')
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    {(onEdit || onDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-manipulation">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {onEdit && (
                            <DropdownMenuItem 
                              onClick={() => onEdit(row)}
                              className="touch-manipulation py-3"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={() => onDelete(row)} 
                              className="text-red-600 touch-manipulation py-3"
                            >
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
            );
          })}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.filter(col => !col.mobileHidden).map((column) => (
                  <TableHead 
                    key={column.key} 
                    style={{ width: column.width }}
                    className={cn("whitespace-nowrap", column.className)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => handleSort(column.key)}
                        >
                          {sortColumn === column.key ? (
                            sortDirection === 'asc' ? (
                              <SortAsc className="h-3 w-3" />
                            ) : (
                              <SortDesc className="h-3 w-3" />
                            )
                          ) : (
                            <SortAsc className="h-3 w-3 opacity-50" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}
                {(onEdit || onDelete) && (
                  <TableHead className="w-[100px] whitespace-nowrap">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id}>
                  {columns.filter(col => !col.mobileHidden).map((column) => (
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
                            className="text-red-600 hover:text-red-700"
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
      )}

      {/* Results Count */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredData.length} of {data.length} results
          </span>
          {(searchTerm || filterValue) && (
            <Badge variant="outline" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};