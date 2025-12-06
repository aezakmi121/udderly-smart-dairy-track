import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Edit, Printer } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { PrintSlipDialog } from './PrintSlipDialog';

interface MilkCollectionTableProps {
  collections: any[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (collection: any) => void;
  onDelete?: (id: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const MilkCollectionTable: React.FC<MilkCollectionTableProps> = ({ 
  collections, 
  isLoading, 
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectionChange
}) => {
  const isMobile = useIsMobile();
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printingCollection, setPrintingCollection] = useState<any>(null);

  const handlePrint = (collection: any) => {
    setPrintingCollection(collection);
    setPrintDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading milk collections...</div>;
  }

  if (!collections || collections.length === 0) {
    return <div className="text-center py-4">No milk collections found.</div>;
  }

  const handleDelete = (id: string) => {
    if (onDelete && confirm('Are you sure you want to delete this collection record?')) {
      onDelete(id);
    }
  };

  const handleEdit = (collection: any) => {
    if (onEdit) {
      onEdit(collection);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange(collections.map(c => c.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
      }
    }
  };

  const allSelected = collections.length > 0 && selectedIds.length === collections.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < collections.length;

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-3 w-full">
          {onSelectionChange && collections.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                  <span className="text-sm font-medium">
                    {allSelected ? 'Deselect all' : 'Select all'} ({collections.length})
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          {collections.map((collection) => (
            <Card key={collection.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header with checkbox and actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {onSelectionChange && (
                        <Checkbox
                          checked={selectedIds.includes(collection.id)}
                          onCheckedChange={(checked) => handleSelectOne(collection.id, checked as boolean)}
                          aria-label={`Select ${collection.farmers?.name || 'collection'}`}
                          className="mt-1"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{collection.farmers?.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          Code: {collection.farmers?.farmer_code || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(collection)}
                        title="Print Slip"
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(collection)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(collection.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Date</div>
                      <div className="font-medium">{formatDate(collection.collection_date)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Session</div>
                      <Badge variant={collection.session === 'morning' ? 'default' : 'secondary'} className="text-xs">
                        {collection.session}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Quantity</div>
                      <div className="font-medium">{collection.quantity} L</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Fat / SNF</div>
                      <div className="font-medium">{collection.fat_percentage}% / {collection.snf_percentage}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Rate</div>
                      <div className="font-medium">₹{collection.rate_per_liter}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Amount</div>
                      <div className="font-semibold text-primary">₹{collection.total_amount}</div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="pt-2 border-t">
                    <Badge variant={collection.is_accepted ? "default" : "destructive"} className="text-xs">
                      {collection.is_accepted ? "Accepted" : "Rejected"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <PrintSlipDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          collection={printingCollection}
        />
      </>
    );
  }

  // Desktop table view
  return (
    <>
      <div className="overflow-x-auto -mx-2 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <Table>
            <TableHeader>
              <TableRow>
                {onSelectionChange && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                )}
                <TableHead className="whitespace-nowrap">Farmer</TableHead>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="whitespace-nowrap">Session</TableHead>
                <TableHead className="whitespace-nowrap">Quantity (L)</TableHead>
                <TableHead className="whitespace-nowrap">Fat %</TableHead>
                <TableHead className="whitespace-nowrap">SNF %</TableHead>
                <TableHead className="whitespace-nowrap">Rate</TableHead>
                <TableHead className="whitespace-nowrap">Total Amount</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection) => (
                <TableRow key={collection.id}>
                  {onSelectionChange && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(collection.id)}
                        onCheckedChange={(checked) => handleSelectOne(collection.id, checked as boolean)}
                        aria-label={`Select ${collection.farmers?.name || 'collection'}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    <div>
                      <div className="font-medium">{collection.farmers?.name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">
                        {collection.farmers?.farmer_code || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(collection.collection_date)}</TableCell>
                  <TableCell className="capitalize whitespace-nowrap">
                    <Badge variant={collection.session === 'morning' ? 'default' : 'secondary'}>
                      {collection.session}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{collection.quantity}</TableCell>
                  <TableCell className="whitespace-nowrap">{collection.fat_percentage}%</TableCell>
                  <TableCell className="whitespace-nowrap">{collection.snf_percentage}%</TableCell>
                  <TableCell className="whitespace-nowrap">₹{collection.rate_per_liter}</TableCell>
                  <TableCell className="font-semibold whitespace-nowrap">₹{collection.total_amount}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={collection.is_accepted ? "default" : "destructive"}>
                      {collection.is_accepted ? "Accepted" : "Rejected"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(collection)}
                        title="Print Slip"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(collection)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(collection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <PrintSlipDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        collection={printingCollection}
      />
    </>
  );
};
