import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Clock, 
  Flag, 
  CheckCircle, 
  Undo, 
  Info,
  AlertTriangle,
  Target,
  ArrowRight
} from 'lucide-react';
import { useAITracking } from '@/hooks/useAITracking';
import { useCowMilkingStatus } from '@/hooks/useCowMilkingStatus';
import { 
  AIRecord, 
  CowSummary, 
  formatCowDate, 
  getDaysAfterAI, 
  getDaysToDelivery,
  isPDDue,
  isPDOverdue,
  pdTargetDate,
  getCowSortGroup,
  SortGroup,
  PD_MIN_DAYS,
  PD_MAX_DAYS
} from '@/lib/pdUtils';
import { sortCowSummaries } from '@/lib/cowSorting';

type FilterType = 'all' | 'about_to_deliver' | 'pd_due' | 'flagged';

export const CowSummaryDashboard: React.FC = () => {
  const { aiRecords, isLoading } = useAITracking();
  const { updateCowMilkingStatus, isUpdating } = useCowMilkingStatus();
  const [filter, setFilter] = useState<FilterType>('all');
  const [includeDelivered, setIncludeDelivered] = useState(true);

  const cowSummaries = useMemo(() => {
    if (!aiRecords) return [];

    // Group records by cow_id and get the latest AI record for each cow
    const cowMap = new Map<string, AIRecord>();
    
    aiRecords.forEach(record => {
      if (record.cow_id && record.cows) {
        const existing = cowMap.get(record.cow_id);
        if (!existing || record.ai_date > existing.ai_date) {
          cowMap.set(record.cow_id, record as any);
        }
      }
    });

    const summaries: CowSummary[] = Array.from(cowMap.values()).map(record => {
      let status: CowSummary['status'] = 'Pending';
      
      if (record.actual_delivery_date) {
        status = 'Delivered';
      } else if (record.pd_result === 'positive') {
        status = 'Pregnant';
      } else if (record.pd_result === 'negative') {
        status = 'Not Pregnant';
      } else if (record.ai_status === 'failed') {
        status = 'Failed';
      }

      return {
        cowId: record.cows!.id,
        cowNumber: record.cows?.cow_number || 'Unknown',
        latestAIDate: record.ai_date,
        serviceNumber: record.service_number || 1,
        status,
        expectedDeliveryDate: record.expected_delivery_date,
        pdDate: record.pd_date,
        deliveredDate: record.actual_delivery_date,
        notes: record.notes,
        needsMilkingMove: record.cows?.needs_milking_move || false,
        needsMilkingMoveAt: record.cows?.needs_milking_move_at,
        movedToMilking: record.cows?.moved_to_milking || false,
        movedToMilkingAt: record.cows?.moved_to_milking_at,
        aiRecord: record
      };
    });

    const today = new Date();

    // Apply filters using unified helpers
    let filtered = summaries.filter(cow => {
      if (!includeDelivered && cow.status === 'Delivered') return false;
      
      switch (filter) {
        case 'about_to_deliver': {
          const daysToDelivery = getDaysToDelivery(cow.expectedDeliveryDate, today);
          return daysToDelivery !== null && daysToDelivery >= 0 && daysToDelivery <= 35 && 
                 cow.aiRecord.pd_done && cow.aiRecord.pd_result === 'positive';
        }
        case 'pd_due':
          return isPDDue(cow.latestAIDate, cow.aiRecord.pd_done, today);
        case 'flagged':
          return cow.needsMilkingMove && !cow.movedToMilking;
        default:
          return true;
      }
    });

    // Sort using new deterministic priority sorting
    return sortCowSummaries(filtered);
  }, [aiRecords, filter, includeDelivered]);

  const getDeliveryBadge = (cow: CowSummary) => {
    const daysToDelivery = getDaysToDelivery(cow.expectedDeliveryDate);
    if (daysToDelivery === null) return null;
    
    if (daysToDelivery === 0) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Due Today
      </Badge>;
    }
    
    if (daysToDelivery === 1) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Due Tomorrow
      </Badge>;
    }
    
    if (daysToDelivery >= 2 && daysToDelivery <= 3) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Due in {daysToDelivery} days
      </Badge>;
    }
    
    if (daysToDelivery >= 4 && daysToDelivery <= 10) {
      return <Badge variant="outline" className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        Due in {daysToDelivery} days
      </Badge>;
    }
    
    if (daysToDelivery >= 28 && daysToDelivery <= 35) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Target className="h-3 w-3" />
        Move to Close-up Group
      </Badge>;
    }
    
    return null;
  };

  const getMoveToMilkingBadge = (cow: CowSummary) => {
    const group = getCowSortGroup(cow);
    if (group !== SortGroup.MOVE_TO_MILKING) return null;
    
    return <Badge variant="outline" className="flex items-center gap-1">
      <ArrowRight className="h-3 w-3" />
      Move to Milking Group
    </Badge>;
  };

  const getPDBadge = (cow: CowSummary) => {
    if (cow.aiRecord.pd_done) return null;
    
    if (isPDOverdue(cow.latestAIDate, cow.aiRecord.pd_done)) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        PD Overdue
      </Badge>;
    }
    
    if (isPDDue(cow.latestAIDate, cow.aiRecord.pd_done)) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        PD Due ({pdTargetDate(cow.latestAIDate)})
      </Badge>;
    }
    
    return null;
  };

  const getStatusColor = (status: CowSummary['status']) => {
    switch (status) {
      case 'Delivered': return 'text-green-600';
      case 'Pregnant': return 'text-blue-600';
      case 'Not Pregnant': return 'text-red-600';
      case 'Failed': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const handleFlagForMove = (cowId: string) => {
    updateCowMilkingStatus.mutate({
      cowId,
      updates: {
        needs_milking_move: true,
        needs_milking_move_at: new Date().toISOString()
      }
    });
  };

  const handleUndoFlag = (cowId: string) => {
    updateCowMilkingStatus.mutate({
      cowId,
      updates: {
        needs_milking_move: false,
        needs_milking_move_at: null
      }
    });
  };

  const handleMarkAsMoved = (cowId: string) => {
    updateCowMilkingStatus.mutate({
      cowId,
      updates: {
        moved_to_milking: true,
        moved_to_milking_at: new Date().toISOString(),
        needs_milking_move: false,
        needs_milking_move_at: null
      }
    });
  };


  if (isLoading) {
    return <div className="flex justify-center p-8">Loading cow summaries...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Label htmlFor="filter">Filter:</Label>
          <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
            <SelectTrigger id="filter" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-md">
              <SelectItem value="all">All Cows</SelectItem>
              <SelectItem value="about_to_deliver">About to Deliver</SelectItem>
              <SelectItem value="pd_due">PD Due</SelectItem>
              <SelectItem value="flagged">Flagged for Move</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch 
            id="include-delivered" 
            checked={includeDelivered}
            onCheckedChange={setIncludeDelivered}
          />
          <Label htmlFor="include-delivered">Include Delivered</Label>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              Legend
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-background border shadow-md">
            <div className="space-y-2">
              <h4 className="font-medium">Badge Legend</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Due Today/Tomorrow</Badge>
                  <span>Immediate delivery expected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Due in 2-10 days</Badge>
                  <span>Delivery approaching</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Move to Close-up Group</Badge>
                  <span>28-35 days before delivery</span>
                </div>
                 <div className="flex items-center gap-2">
                   <Badge variant="secondary">PD Due</Badge>
                   <span>Pregnancy diagnosis needed (45–60 days post-AI)</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Badge variant="destructive">PD Overdue</Badge>
                   <span>PD Overdue (&gt;60 days post-AI)</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Badge variant="outline">Move to Milking Group</Badge>
                   <span>Ready for milking group transfer (2 months pre-delivery)</span>
                 </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Cow Cards */}
      {cowSummaries.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              No cows found matching the selected filters
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cowSummaries.map((cow) => (
            <Card key={cow.cowId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header with Cow Number and Primary Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="font-semibold text-lg">Cow #{cow.cowNumber}</h3>
                     <div className="flex flex-wrap gap-2">
                       {getMoveToMilkingBadge(cow)}
                       {getDeliveryBadge(cow)}
                       {getPDBadge(cow)}
                       {cow.needsMilkingMove && !cow.movedToMilking && (
                         <Badge variant="outline" className="flex items-center gap-1">
                           <Flag className="h-3 w-3" />
                           Flagged for Move
                         </Badge>
                       )}
                       {cow.movedToMilking && (
                         <Badge variant="default" className="flex items-center gap-1">
                           <CheckCircle className="h-3 w-3" />
                           Moved to Milking
                         </Badge>
                       )}
                     </div>
                  </div>
                  
                  {/* Main Data Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* AI Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">AI Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                           <div className="min-w-0 flex-1">
                             <span className="text-sm text-muted-foreground">AI Date:</span>
                             <div className="font-medium">{formatCowDate(cow.latestAIDate)}</div>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-16 flex-shrink-0">Service:</span>
                          <span className="font-medium">#{cow.serviceNumber}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-16 flex-shrink-0">Status:</span>
                          <span className={`font-medium ${getStatusColor(cow.status)}`}>{cow.status}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pregnancy & Delivery Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pregnancy & Delivery</h4>
                      <div className="space-y-2">
                        {/* Show PD Due Date for pending PD cases */}
                        {!cow.aiRecord.pd_done && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm text-muted-foreground">PD Due:</span>
                               <div className="font-medium text-amber-600">
                                 {pdTargetDate(cow.latestAIDate)}
                               </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show Expected Delivery only after successful PD */}
                        {cow.aiRecord.pd_done && cow.aiRecord.pd_result === 'positive' && cow.expectedDeliveryDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                             <div className="min-w-0 flex-1">
                               <span className="text-sm text-muted-foreground">Expected Delivery:</span>
                               <div className="font-medium text-blue-600">{formatCowDate(cow.expectedDeliveryDate)}</div>
                             </div>
                          </div>
                        )}
                        
                        {cow.pdDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-20 flex-shrink-0">PD Result:</span>
                            <span className={`font-medium ${
                              cow.aiRecord.pd_result === 'positive' ? 'text-green-600' : 
                              cow.aiRecord.pd_result === 'negative' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {cow.aiRecord.pd_result || 'Unknown'} ({formatCowDate(cow.pdDate)})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-20 flex-shrink-0">PD Status:</span>
                            <span className="font-medium text-amber-600">Pending</span>
                          </div>
                        )}
                        
                        {cow.deliveredDate && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-20 flex-shrink-0">Delivered:</span>
                            <span className="font-medium text-green-600">{formatCowDate(cow.deliveredDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes Section */}
                  {cow.notes && (
                    <div className="border-t pt-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{cow.notes}</p>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {!cow.movedToMilking && (
                    <div className="border-t pt-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {cow.needsMilkingMove ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndoFlag(cow.cowId)}
                              disabled={isUpdating}
                              className="flex items-center justify-center gap-2"
                            >
                              <Undo className="h-4 w-4" />
                              Undo Flag
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsMoved(cow.cowId)}
                              disabled={isUpdating}
                              className="flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Mark as Moved
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFlagForMove(cow.cowId)}
                            disabled={isUpdating}
                            className="flex items-center justify-center gap-2"
                          >
                            <Flag className="h-4 w-4" />
                            Flag: Needs Move
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
