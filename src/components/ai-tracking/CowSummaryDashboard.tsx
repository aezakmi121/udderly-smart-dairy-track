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
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import {
  groupHerd, cowBadges, ACTION_ORDER, INFO_ORDER, ACTION_LABEL, ACTION_HELP,
  type ActionGroup, type CowBadge,
} from '@/lib/breedingActions';
import { buildCowCycle, type CowCycle } from '@/lib/cowCycle';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { CowActionRow } from './CowActionRow';
import { QuickPdSheet, QuickCalvingSheet } from './QuickActionSheets';
import { CowTimelineSheet } from './CowTimelineSheet';

type FilterType = 'all' | 'about_to_deliver' | 'pd_due' | 'flagged';

/** A cow summary with her lactation read across every record she has. */
type BoardCow = CowSummary & { cycle: CowCycle };

/** The fold that hides position-only headings behind one line. */
const INFO_TIER_KEY = 'everything-else';

/** Active cows the board cannot see, because they have no record to read. */
const NEVER_SERVED_KEY = 'never-served';

const OPEN_GROUPS_KEY = 'breeding-board-open-groups';

/**
 * Which headings are expanded, remembered between visits.
 *
 * Everything starts closed: the point of the board is to be readable in one
 * glance. Whoever works PD overdue first every morning opens it once and finds
 * it open thereafter.
 */
const useOpenGroups = (initial: ActionGroup[]) => {
  const [open, setOpen] = useState<ActionGroup[]>(() => {
    try {
      const stored = localStorage.getItem(OPEN_GROUPS_KEY);
      const remembered: ActionGroup[] = stored ? JSON.parse(stored) : [];
      return Array.from(new Set([...remembered, ...initial]));
    } catch {
      return initial;
    }
  });

  const toggle = (group: ActionGroup, isOpen: boolean) => {
    setOpen((prev) => {
      const next = isOpen ? Array.from(new Set([...prev, group])) : prev.filter((g) => g !== group);
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // A browser refusing storage is not a reason to stop working.
      }
      return next;
    });
  };

  return { open, toggle };
};

export const CowSummaryDashboard: React.FC<{ expandGroups?: ActionGroup[] }> = ({ expandGroups }) => {
  const { aiRecords, isLoading, updateAIRecordMutation } = useAITracking();
  const { updateCowMilkingStatus, isUpdating } = useCowMilkingStatus();
  const [filter, setFilter] = useState<FilterType>('all');
  const [includeDelivered, setIncludeDelivered] = useState(false);
  const [search, setSearch] = useState('');
  const [showEverything, setShowEverything] = useState(false);
  const [pdFor, setPdFor] = useState<CowSummary | null>(null);
  const [calvingFor, setCalvingFor] = useState<CowSummary | null>(null);
  const [timelineFor, setTimelineFor] = useState<CowSummary | null>(null);
  const { open: openGroups, toggle: toggleGroup } = useOpenGroups(expandGroups ?? []);

  const { value: storedBreeding } = useAppSetting<BreedingSettings>(BREEDING_SETTINGS_KEY);
  const breeding = useMemo(() => normaliseBreedingSettings(storedBreeding), [storedBreeding]);

  // The board is built from ai_records, so a cow who has never been served has
  // no row to be built from and appears nowhere at all -- more than a third of
  // this herd, when it was checked. Reading the herd separately is what lets
  // the count at the foot be honest about them.
  const { data: activeCows = [] } = useQuery({
    queryKey: ['active-cows-for-board'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number')
        .eq('status', 'active')
        .order('cow_number');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

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

    const summaries: BoardCow[] = Array.from(byCow.entries()).flatMap(([cowId, records]) => {
      const record = latestRecord(records as any) as AIRecord | null;
      if (!record) return [];
      // Her whole history, not just this row: the calving lives on the previous
      // record the moment she is served again.
      const cycle = buildCowCycle(records, record);

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
        aiRecord: record,
        cycle,
      }];
    });

    return summaries;
  }, [aiRecords]);

  const cowSummaries = useMemo(() => {
    const today = new Date();

    // Apply filters using unified helpers
    const filtered = allSummaries.filter(cow => {
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
   * Every cow under exactly one heading, so the counts add up to the herd and
   * a cow who has fallen through shows as a number that does not reconcile.
   */
  const grouped = useMemo(() => {
    const entries = allSummaries.map((c) => {
      const base = {
        record: {
          ai_date: c.aiRecord.ai_date,
          ai_status: c.aiRecord.ai_status ?? null,
          pd_done: c.aiRecord.pd_done ?? null,
          pd_result: c.aiRecord.pd_result ?? null,
          actual_delivery_date: c.aiRecord.actual_delivery_date ?? null,
          expected_delivery_date: c.expectedDeliveryDate ?? null,
        },
        movedToMilking: c.movedToMilking,
        cycle: c.cycle,
      };
      return { ...base, badges: cowBadges(base, breeding), summary: c };
    });
    return groupHerd(entries, breeding);
  }, [allSummaries, breeding]);

  const actionCount = ACTION_ORDER.reduce((n, g) => n + (grouped.stages.get(g)?.length ?? 0), 0);
  const infoCount = INFO_ORDER.reduce((n, g) => n + (grouped.stages.get(g)?.length ?? 0), 0);

  // Active cows with no service on record at all — heifers coming up, or cows
  // nobody has entered. Either way they belong in the count.
  const neverServed = useMemo(() => {
    const onBoard = new Set(allSummaries.map((c) => c.cowId));
    return activeCows.filter((c) => !onBoard.has(c.id));
  }, [activeCows, allSummaries]);

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

  function renderCow(
    cow: BoardCow,
    group: ActionGroup | null = null,
    badges: CowBadge[] = [],
    oddRecord = false
  ) {
    return (
      <CowActionRow
        key={cow.cowId + (oddRecord ? '-odd' : '')}
        cow={cow}
        group={group}
        oddRecord={oddRecord}
        cycle={cow.cycle}
        badges={badges}
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

    const odd = grouped.oddRecords;
    const infoOpen = openGroups.includes(INFO_TIER_KEY as ActionGroup);

    return (
      <div className="space-y-2">
        {ACTION_ORDER.map((group) => {
          const rows = grouped.stages.get(group) ?? [];
          if (rows.length === 0) return null;
          return (
            <ActionSection
              key={group}
              group={group}
              count={rows.length}
              open={openGroups.includes(group)}
              onOpenChange={(v) => toggleGroup(group, v)}
            >
              {rows.map((r) => renderCow(r.summary, group, r.badges))}
            </ActionSection>
          );
        })}

        {/* Position rather than work. One line, because you read these weekly
            and they should not cost what PD overdue costs. */}
        {infoCount > 0 && (
          <Collapsible
            open={infoOpen}
            onOpenChange={(v) => toggleGroup(INFO_TIER_KEY as ActionGroup, v)}
            className="rounded-lg border border-dashed"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50">
              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${infoOpen ? 'rotate-90' : ''}`} />
              <span className="flex-1 text-sm font-medium text-muted-foreground">Everything else</span>
              <Badge variant="secondary">{infoCount}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 border-t p-3">
              {INFO_ORDER.map((group) => {
                const rows = grouped.stages.get(group) ?? [];
                if (rows.length === 0) return null;
                return (
                  <ActionSection
                    key={group}
                    group={group}
                    count={rows.length}
                    muted
                    open={openGroups.includes(group)}
                    onOpenChange={(v) => toggleGroup(group, v)}
                  >
                    {rows.map((r) => renderCow(r.summary, group, r.badges))}
                  </ActionSection>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Not a job for the shed -- a calving sitting on the wrong record.
            Off the board, but not lost. */}
        {odd.length > 0 && (
          <Collapsible
            open={openGroups.includes('check_record' as ActionGroup)}
            onOpenChange={(v) => toggleGroup('check_record' as ActionGroup, v)}
            className="rounded-lg border"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50">
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform ${openGroups.includes('check_record' as ActionGroup) ? 'rotate-90' : ''}`}
              />
              <span className="flex-1 text-sm text-muted-foreground">Check the record</span>
              <Badge variant="secondary">{odd.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 border-t p-3">
              <p className="text-xs text-muted-foreground">
                The gap between service and calving is impossible — the calving is on the wrong
                record, or a date is wrong.
              </p>
              <div className="grid gap-2">
                {odd.map((r) => renderCow(r.summary, null, [], true))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Never served at all, so no record exists to build a stage from. */}
        {neverServed.length > 0 && (
          <Collapsible
            open={openGroups.includes(NEVER_SERVED_KEY as ActionGroup)}
            onOpenChange={(v) => toggleGroup(NEVER_SERVED_KEY as ActionGroup, v)}
            className="rounded-lg border border-dashed"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50">
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform ${openGroups.includes(NEVER_SERVED_KEY as ActionGroup) ? 'rotate-90' : ''}`}
              />
              <span className="flex-1 text-sm text-muted-foreground">Never served</span>
              <Badge variant="secondary">{neverServed.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 border-t p-3">
              <p className="text-xs text-muted-foreground">
                No service on record — a heifer coming up to breeding age, or a cow nobody has
                entered yet. Add an AI record and she joins the board.
              </p>
              <div className="flex flex-wrap gap-1">
                {neverServed.map((c) => (
                  <Badge key={c.id} variant="outline" className="tabular-nums">#{c.cow_number}</Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* The stages are a partition, so this either reconciles against the
            herd or tells you exactly how many cows the board cannot see. */}
        <p className="px-1 pt-1 text-[11px] text-muted-foreground">
          {grouped.placed + neverServed.length} of {activeCows.length || grouped.placed} active{' '}
          {activeCows.length === 1 ? 'cow' : 'cows'} accounted for
          {neverServed.length > 0 && ` · ${neverServed.length} never served`}
          {grouped.unplaced > 0 && ` · ${grouped.unplaced} with an unreadable record`}
        </p>
      </div>
    );
  }
};

/**
 * One heading on the morning board.
 *
 * Collapsed by default, so the board opens as a handful of lines you can read
 * at a glance -- which job, how many cows -- rather than a page of cards to
 * scroll past before finding the one you came for.
 */
const ActionSection: React.FC<{
  group: ActionGroup;
  count: number;
  open: boolean;
  muted?: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ group, count, open, muted, onOpenChange, children }) => (
  <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-lg border">
    <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50">
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      <span className={`flex-1 font-semibold ${muted ? 'text-sm text-muted-foreground' : ''}`}>
        {ACTION_LABEL[group]}
      </span>
      <Badge variant="secondary">{count}</Badge>
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-2 border-t p-3">
      <p className="text-xs text-muted-foreground">{ACTION_HELP[group]}</p>
      <div className="grid gap-2">{children}</div>
    </CollapsibleContent>
  </Collapsible>
);
