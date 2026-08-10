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
  ArrowRight,
  Search,
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
import { cycleState, latestRecord } from '@/lib/aiCycle';
import { useAppSetting } from '@/hooks/useAppSettings';
import {
  BREEDING_SETTINGS_KEY,
  normaliseBreedingSettings,
  type BreedingSettings,
} from '@/lib/breedingSettings';
import { groupHerd, ACTION_ORDER, ACTION_LABEL, ACTION_HELP, type ActionGroup } from '@/lib/breedingActions';
import { Input } from '@/components/ui/input';
import { CowActionRow } from './CowActionRow';
import { QuickPdSheet, QuickCalvingSheet } from './QuickActionSheets';
import { CowTimelineSheet } from './CowTimelineSheet';

type FilterType = 'all' | 'about_to_deliver' | 'pd_due' | 'flagged';

export const CowSummaryDashboard: React.FC = () => {
  const { aiRecords, isLoading, updateAIRecordMutation } = useAITracking();
  const { updateCowMilkingStatus, isUpdating } = useCowMilkingStatus();
  const [filter, setFilter] = useState<FilterType>('all');
  const [includeDelivered, setIncludeDelivered] = useState(false);
  const [search, setSearch] = useState('');
  const [showEverything, setShowEverything] = useState(false);
  const [pdFor, setPdFor] = useState<CowSummary | null>(null);
  const [calvingFor, setCalvingFor] = useState<CowSummary | null>(null);
  const [timelineFor, setTimelineFor] = useState<CowSummary | null>(null);

  const { value: storedBreeding } = useAppSetting<BreedingSettings>(BREEDING_SETTINGS_KEY);
  const breeding = useMemo(() => normaliseBreedingSettings(storedBreeding), [storedBreeding]);

  const allSummaries = useMemo(() => {
    if (!aiRecords) return [];

    // A cow that has left the herd has no breeding to track. Her records stay
    // in All Records; keeping her on this board meant cow 48 sat there as
    // "Pregnant" indefinitely after being sold.
    const byCow = new Map<string, AIRecord[]>();
    aiRecords.forEach(record => {
      if (!record.cow_id || !record.cows) return;
      if ((record.cows as any).status && (record.cows as any).status !== 'active') return;
      const list = byCow.get(record.cow_id) ?? [];
      list.push(record as any);
      byCow.set(record.cow_id, list);
    });

    const summaries: CowSummary[] = Array.from(byCow.entries()).flatMap(([cowId, records]) => {
      const record = latestRecord(records as any) as AIRecord | null;
      if (!record) return [];

      // A calving outranks the PD on the same row: seven records say delivered
      // and PD negative at once, and reality wins.
      const state = cycleState(record as any);
      const status: CowSummary['status'] =
        state === 'delivered' ? 'Delivered'
        : state === 'pregnant' ? 'Pregnant'
        : state === 'open' ? 'Not Pregnant'
        : state === 'failed' ? 'Failed'
        : 'Pending';

      return [{
        cowId,
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
      }];
    });

    return summaries;
  }, [aiRecords]);

  const cowSummaries = useMemo(() => {
    const today = new Date();

    // Apply filters using unified helpers
    let filtered = allSummaries.filter(cow => {
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
  }, [allSummaries, filter, includeDelivered]);

  // Searching looks across the whole herd, not just whatever filter is on --
  // when you are asking after one cow you do not want to be told she is hidden.
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return allSummaries.filter((c) => String(c.cowNumber).toLowerCase().includes(q));
  }, [allSummaries, search]);

  /**
   * The board answers three questions asked every morning: who needs a PD, who
   * is about to calve, and who must move from the dry group to milking. Those
   * are the headings; everything else is folded away.
   */
  const grouped = useMemo(
    () =>
      groupHerd(
        allSummaries.map((c) => ({
          record: { ...(c.aiRecord as any), expected_delivery_date: c.expectedDeliveryDate },
          movedToMilking: c.movedToMilking,
          summary: c,
        })),
        breeding
      ),
    [allSummaries, breeding]
  );

  const actionCount = ACTION_ORDER.reduce((n, g) => n + (grouped.get(g)?.length ?? 0), 0);

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


  const savePd = (cow: CowSummary, result: string, examinedOn: string) => {
    updateAIRecordMutation.mutate(
      { id: cow.aiRecord.id, pd_done: true, pd_result: result as 'positive' | 'negative' | 'inconclusive', pd_date: examinedOn },
      { onSuccess: () => setPdFor(null) }
    );
  };

  const saveCalving = (cow: CowSummary, calvedOn: string) => {
    updateAIRecordMutation.mutate(
      {
        id: cow.aiRecord.id,
        actual_delivery_date: calvedOn,
        is_successful: true,
        // The calf settles the PD, whatever was entered at the time. The
        // database constraint refuses the row otherwise.
        pd_done: true,
        pd_result: 'positive' as const,
      },
      { onSuccess: () => setCalvingFor(null) }
    );
  };

  const timelineRecords = timelineFor
    ? (aiRecords ?? []).filter((r) => r.cow_id === timelineFor.cowId)
    : [];

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading cow summaries...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            placeholder="Find a cow by number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="show-everything" checked={showEverything} onCheckedChange={setShowEverything} />
          <Label htmlFor="show-everything">Show the whole herd</Label>
        </div>

        {showEverything && (
          <div className="flex items-center gap-2">
            <Switch id="include-delivered" checked={includeDelivered} onCheckedChange={setIncludeDelivered} />
            <Label htmlFor="include-delivered">Include delivered</Label>
          </div>
        )}
      </div>

      {renderBoard()}

      <QuickPdSheet
        cow={pdFor}
        busy={updateAIRecordMutation.isPending}
        onClose={() => setPdFor(null)}
        onSave={savePd}
      />
      <QuickCalvingSheet
        cow={calvingFor}
        busy={updateAIRecordMutation.isPending}
        onClose={() => setCalvingFor(null)}
        onSave={saveCalving}
      />
      <CowTimelineSheet
        cowNumber={timelineFor?.cowNumber}
        records={timelineRecords}
        open={!!timelineFor}
        onClose={() => setTimelineFor(null)}
      />
    </div>
  );

  function renderCow(cow: CowSummary, group: ActionGroup | null = null) {
    return (
      <CowActionRow
        key={cow.cowId}
        cow={cow}
        group={group}
        busy={isUpdating || updateAIRecordMutation.isPending}
        onRecordPd={setPdFor}
        onRecordCalving={setCalvingFor}
        onFlagForMove={handleFlagForMove}
        onUndoFlag={handleUndoFlag}
        onMarkMoved={handleMarkAsMoved}
        onOpenTimeline={setTimelineFor}
      />
    );
  }

  function renderBoard() {
    // A search is a direct question about one cow; answer it and nothing else.
    if (searched) {
      return searched.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          No cow matches "{search}".
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">{searched.map((c) => renderCow(c))}</div>
      );
    }

    if (showEverything) {
      return cowSummaries.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          No cows to show.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">{cowSummaries.map((c) => renderCow(c))}</div>
      );
    }

    // Nothing to do is worth saying out loud -- it is the most useful thing a
    // morning screen can tell you.
    if (actionCount === 0) {
      return (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
            <p className="font-medium">Nothing needs attention today.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No PDs due, no calvings close, nobody waiting to move to milking.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {ACTION_ORDER.map((group) => {
          const rows = grouped.get(group) ?? [];
          if (rows.length === 0) return null;
          return (
            <section key={group} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold">{ACTION_LABEL[group]}</h3>
                <Badge variant="secondary">{rows.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{ACTION_HELP[group]}</p>
              <div className="grid gap-2">
                {rows.map((r: any) => renderCow(r.summary as CowSummary, group))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }
};
