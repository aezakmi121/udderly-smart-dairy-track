import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Trash2, Plus } from 'lucide-react';

interface MilkRecord {
  id: string;
  cow_id?: string;
  session: 'morning' | 'evening';
  quantity: number;
  fat_percentage?: number;
  snf_percentage?: number;
  remarks?: string;
  created_at: string;
  cows?: {
    cow_number: string;
  };
}

interface CowDailySummary {
  cowId: string | null;
  cowNumber: string;
  morningQty: number | null;
  eveningQty: number | null;
  totalQty: number;
  morningRemarks: string[];
  eveningRemarks: string[];
  combinedRemarks: string;
  morningRecords: MilkRecord[];
  eveningRecords: MilkRecord[];
}

interface MilkProductionTableSummaryProps {
  milkRecords: MilkRecord[];
  onEdit: (record: MilkRecord) => void;
  onDelete: (id: string) => void;
  onAddSession?: (session: 'morning' | 'evening', cowId?: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const MilkProductionTableSummary: React.FC<MilkProductionTableSummaryProps> = ({
  milkRecords,
  onEdit,
  onDelete,
  onAddSession,
  canEdit = false,
  canDelete = false
}) => {
  const { cowSummaries, totals } = useMemo(() => {
    const cowMap = new Map<string, CowDailySummary>();
    
    // Group records by cow
    milkRecords.forEach(record => {
      const cowKey = record.cow_id || 'bulk';
      const cowNumber = record.cows?.cow_number || 'Bulk Entry';
      
      if (!cowMap.has(cowKey)) {
        cowMap.set(cowKey, {
          cowId: record.cow_id || null,
          cowNumber,
          morningQty: null,
          eveningQty: null,
          totalQty: 0,
          morningRemarks: [],
          eveningRemarks: [],
          combinedRemarks: '',
          morningRecords: [],
          eveningRecords: []
        });
      }
      
      const summary = cowMap.get(cowKey)!;
      
      if (record.session === 'morning') {
        summary.morningQty = (summary.morningQty || 0) + record.quantity;
        summary.morningRecords.push(record);
        if (record.remarks) summary.morningRemarks.push(record.remarks);
      } else {
        summary.eveningQty = (summary.eveningQty || 0) + record.quantity;
        summary.eveningRecords.push(record);
        if (record.remarks) summary.eveningRemarks.push(record.remarks);
      }
    });
    
    // Finalize summaries
    const summaries = Array.from(cowMap.values()).map(summary => {
      summary.totalQty = (summary.morningQty || 0) + (summary.eveningQty || 0);
      
      // Combine remarks logic
      const morningRemark = summary.morningRemarks.length > 0 ? summary.morningRemarks.join(', ') : '';
      const eveningRemark = summary.eveningRemarks.length > 0 ? summary.eveningRemarks.join(', ') : '';
      
      if (morningRemark && eveningRemark) {
        if (morningRemark === eveningRemark) {
          summary.combinedRemarks = morningRemark;
        } else {
          summary.combinedRemarks = `Morning: ${morningRemark} | Evening: ${eveningRemark}`;
        }
      } else {
        summary.combinedRemarks = morningRemark || eveningRemark;
      }
      
      return summary;
    });
    
    // Sort: numeric cow numbers first, bulk entries last
    summaries.sort((a, b) => {
      if (a.cowId === null && b.cowId !== null) return 1;
      if (a.cowId !== null && b.cowId === null) return -1;
      return a.cowNumber.localeCompare(b.cowNumber, undefined, { numeric: true });
    });
    
    // Calculate totals
    const totalMorning = summaries.reduce((sum, s) => sum + (s.morningQty || 0), 0);
    const totalEvening = summaries.reduce((sum, s) => sum + (s.eveningQty || 0), 0);
    const totalDaily = totalMorning + totalEvening;
    
    return {
      cowSummaries: summaries,
      totals: { morning: totalMorning, evening: totalEvening, daily: totalDaily }
    };
  }, [milkRecords]);

  const formatQuantity = (qty: number | null) => {
    return qty !== null ? `${qty.toFixed(1)} L` : 'N/A';
  };

  const handleEdit = (records: MilkRecord[], session: 'morning' | 'evening') => {
    if (records.length === 0) return;
    
    // If multiple records, edit the latest by created_at
    const latest = records.reduce((prev, curr) => 
      new Date(curr.created_at) > new Date(prev.created_at) ? curr : prev
    );
    
    onEdit(latest);
  };

  const handleDelete = (records: MilkRecord[], session: 'morning' | 'evening') => {
    if (records.length === 0) return;
    
    // For multiple records, delete them all (or show a selection dialog)
    // For simplicity, we'll delete the latest one
    const latest = records.reduce((prev, curr) => 
      new Date(curr.created_at) > new Date(prev.created_at) ? curr : prev
    );
    
    if (confirm(`Delete ${session} record for this cow?`)) {
      onDelete(latest.id);
    }
  };

  const truncateRemarks = (remarks: string, maxLength: number = 30) => {
    if (remarks.length <= maxLength) return remarks;
    return remarks.substring(0, maxLength) + '...';
  };

  if (cowSummaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No records for the selected date.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Cow</TableHead>
              <TableHead>Morning Qty</TableHead>
              <TableHead>Evening Qty</TableHead>
              <TableHead>Today&apos;s Total</TableHead>
              <TableHead>Remarks</TableHead>
              {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {cowSummaries.map((summary) => (
              <TableRow key={summary.cowId || 'bulk'}>
                <TableCell className="font-medium">
                  {summary.cowNumber}
                </TableCell>
                
                <TableCell>
                  {formatQuantity(summary.morningQty)}
                </TableCell>
                
                <TableCell>
                  {formatQuantity(summary.eveningQty)}
                </TableCell>
                
                <TableCell className="font-medium">
                  {formatQuantity(summary.totalQty)}
                </TableCell>
                
                <TableCell>
                  {summary.combinedRemarks ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {truncateRemarks(summary.combinedRemarks)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>{summary.combinedRemarks}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                
                {(canEdit || canDelete) && (
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Morning Actions */}
                      {summary.morningRecords.length > 0 && (
                        <>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(summary.morningRecords, 'morning')}
                              title="Edit Morning"
                            >
                              <Edit className="h-3 w-3" />
                              <Badge variant="default" className="ml-1 text-xs">M</Badge>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(summary.morningRecords, 'morning')}
                              title="Delete Morning"
                            >
                              <Trash2 className="h-3 w-3" />
                              <Badge variant="default" className="ml-1 text-xs">M</Badge>
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Evening Actions */}
                      {summary.eveningRecords.length > 0 && (
                        <>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(summary.eveningRecords, 'evening')}
                              title="Edit Evening"
                            >
                              <Edit className="h-3 w-3" />
                              <Badge variant="secondary" className="ml-1 text-xs">E</Badge>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(summary.eveningRecords, 'evening')}
                              title="Delete Evening"
                            >
                              <Trash2 className="h-3 w-3" />
                              <Badge variant="secondary" className="ml-1 text-xs">E</Badge>
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Add Session Links */}
                      {onAddSession && (
                        <>
                          {summary.morningRecords.length === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddSession('morning', summary.cowId || undefined)}
                              title="Add Morning"
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Morning
                            </Button>
                          )}
                          {summary.eveningRecords.length === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddSession('evening', summary.cowId || undefined)}
                              title="Add Evening"
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Evening
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          
          <TableFooter className="sticky bottom-0 bg-background">
            <TableRow>
              <TableCell className="font-semibold">Totals</TableCell>
              <TableCell className="font-semibold">{formatQuantity(totals.morning)}</TableCell>
              <TableCell className="font-semibold">{formatQuantity(totals.evening)}</TableCell>
              <TableCell className="font-semibold">{formatQuantity(totals.daily)}</TableCell>
              <TableCell></TableCell>
              {(canEdit || canDelete) && <TableCell></TableCell>}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </TooltipProvider>
  );
};