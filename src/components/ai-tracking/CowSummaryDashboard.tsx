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
  Target
} from 'lucide-react';
import { useAITracking } from '@/hooks/useAITracking';
import { useCowMilkingStatus } from '@/hooks/useCowMilkingStatus';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';

interface CowSummary {
  cowId: string;
  cowNumber: string;
  latestAIDate: string;
  serviceNumber: number;
  status: 'Pregnant' | 'Not Pregnant' | 'Failed' | 'Pending' | 'Delivered';
  expectedDeliveryDate?: string;
  pdDate?: string;
  deliveredDate?: string;
  notes?: string;
  needsMilkingMove: boolean;
  needsMilkingMoveAt?: string;
  movedToMilking: boolean;
  movedToMilkingAt?: string;
  aiRecord: any;
}

type FilterType = 'all' | 'about_to_deliver' | 'pd_due' | 'flagged';

export const CowSummaryDashboard: React.FC = () => {
  const { aiRecords, isLoading } = useAITracking();
  const { updateCowMilkingStatus, isUpdating } = useCowMilkingStatus();
  const [filter, setFilter] = useState<FilterType>('all');
  const [includeDelivered, setIncludeDelivered] = useState(true);

  const cowSummaries = useMemo(() => {
    if (!aiRecords) return [];

    // Group records by cow_id and get the latest AI record for each cow
    const cowMap = new Map<string, any>();
    
    aiRecords.forEach(record => {
      if (record.cow_id && record.cows) {
        const existing = cowMap.get(record.cow_id);
        if (!existing || record.ai_date > existing.ai_date) {
          cowMap.set(record.cow_id, record);
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
        cowId: record.cow_id,
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

    // Apply filters
    let filtered = summaries.filter(cow => {
      if (!includeDelivered && cow.status === 'Delivered') return false;
      
      const today = new Date();
      const daysAfterAI = isValid(parseISO(cow.latestAIDate)) 
        ? differenceInDays(today, parseISO(cow.latestAIDate)) 
        : 999;
      
      const daysToDelivery = cow.expectedDeliveryDate && isValid(parseISO(cow.expectedDeliveryDate))
        ? differenceInDays(parseISO(cow.expectedDeliveryDate), today)
        : 999;

      switch (filter) {
        case 'about_to_deliver':
          return daysToDelivery >= 0 && daysToDelivery <= 35;
        case 'pd_due':
          return daysAfterAI >= 45 && daysAfterAI <= 60 && !cow.aiRecord.pd_done;
        case 'flagged':
          return cow.needsMilkingMove && !cow.movedToMilking;
        default:
          return true;
      }
    });

    // Sort by priority
    return filtered.sort((a, b) => {
      const today = new Date();
      
      // Priority 1: About to deliver (earliest first)
      const aDelivery = a.expectedDeliveryDate && isValid(parseISO(a.expectedDeliveryDate))
        ? differenceInDays(parseISO(a.expectedDeliveryDate), today) : 999;
      const bDelivery = b.expectedDeliveryDate && isValid(parseISO(b.expectedDeliveryDate))
        ? differenceInDays(parseISO(b.expectedDeliveryDate), today) : 999;
      
      const aAboutToDeliver = aDelivery >= 0 && aDelivery <= 35;
      const bAboutToDeliver = bDelivery >= 0 && bDelivery <= 35;
      
      if (aAboutToDeliver && !bAboutToDeliver) return -1;
      if (!aAboutToDeliver && bAboutToDeliver) return 1;
      if (aAboutToDeliver && bAboutToDeliver) return aDelivery - bDelivery;
      
      // Priority 2: PD due
      const aDaysAfterAI = isValid(parseISO(a.latestAIDate)) 
        ? differenceInDays(today, parseISO(a.latestAIDate)) : 0;
      const bDaysAfterAI = isValid(parseISO(b.latestAIDate)) 
        ? differenceInDays(today, parseISO(b.latestAIDate)) : 0;
      
      const aPDDue = aDaysAfterAI >= 45 && aDaysAfterAI <= 60 && !a.aiRecord.pd_done;
      const bPDDue = bDaysAfterAI >= 45 && bDaysAfterAI <= 60 && !b.aiRecord.pd_done;
      
      if (aPDDue && !bPDDue) return -1;
      if (!aPDDue && bPDDue) return 1;
      
      // Priority 3: Latest AI date (desc)
      const aiDateCompare = b.latestAIDate.localeCompare(a.latestAIDate);
      if (aiDateCompare !== 0) return aiDateCompare;
      
      // Priority 4: Cow number (asc)
      return a.cowNumber.localeCompare(b.cowNumber, undefined, { numeric: true });
    });
  }, [aiRecords, filter, includeDelivered]);

  const getDeliveryBadge = (cow: CowSummary) => {
    if (!cow.expectedDeliveryDate || !isValid(parseISO(cow.expectedDeliveryDate))) return null;
    
    const today = new Date();
    const daysToDelivery = differenceInDays(parseISO(cow.expectedDeliveryDate), today);
    
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

  const getPDBadge = (cow: CowSummary) => {
    if (cow.aiRecord.pd_done) return null;
    
    const today = new Date();
    const daysAfterAI = isValid(parseISO(cow.latestAIDate)) 
      ? differenceInDays(today, parseISO(cow.latestAIDate)) 
      : 0;
    
    if (daysAfterAI >= 45 && daysAfterAI <= 60) {
      const pdDueDate = new Date(parseISO(cow.latestAIDate));
      pdDueDate.setDate(pdDueDate.getDate() + 60);
      
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        PD Due ({format(pdDueDate, 'dd-MM')})
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

  const formatDate = (dateStr: string) => {
    if (!dateStr || !isValid(parseISO(dateStr))) return 'Invalid Date';
    return format(parseISO(dateStr), 'dd-MM-yyyy');
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
                  <span>Pregnancy diagnosis needed (45-60 days post-AI)</span>
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
                            <div className="font-medium">{formatDate(cow.latestAIDate)}</div>
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
                        {cow.expectedDeliveryDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm text-muted-foreground">Expected:</span>
                              <div className="font-medium">{formatDate(cow.expectedDeliveryDate)}</div>
                            </div>
                          </div>
                        )}
                        
                        {cow.pdDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-16 flex-shrink-0">PD Done:</span>
                            <span className="font-medium">{formatDate(cow.pdDate)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-16 flex-shrink-0">PD Status:</span>
                            <span className="font-medium text-amber-600">Pending</span>
                          </div>
                        )}
                        
                        {cow.deliveredDate && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-16 flex-shrink-0">Delivered:</span>
                            <span className="font-medium text-green-600">{formatDate(cow.deliveredDate)}</span>
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
