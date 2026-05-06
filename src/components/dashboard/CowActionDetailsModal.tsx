import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCowActionDetails, type ActionCategory } from '@/hooks/useCowActionDetails';
import { formatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface Props {
  category: ActionCategory | null;
  onClose: () => void;
}

const META: Record<ActionCategory, { title: string; description: string; tone: string; routeFilter: string }> = {
  'pd-due': {
    title: 'PD Due',
    description: 'Cows where pregnancy detection is overdue (≥60 days since AI).',
    tone: 'text-amber-600 dark:text-amber-400',
    routeFilter: 'pd-due',
  },
  'close-delivery': {
    title: 'Close to Delivery',
    description: 'Pregnant cows due to deliver within the next 60 days.',
    tone: 'text-blue-600 dark:text-blue-400',
    routeFilter: 'close-delivery',
  },
  'overdue-delivery': {
    title: 'Overdue Delivery',
    description: 'Pregnant cows past their expected delivery date.',
    tone: 'text-red-600 dark:text-red-400',
    routeFilter: 'overdue-delivery',
  },
  'needs-ai': {
    title: 'Needs AI',
    description: 'Active cows without an open pregnancy — sorted by longest gap since calving.',
    tone: 'text-purple-600 dark:text-purple-400',
    routeFilter: 'needs-ai',
  },
};

export const CowActionDetailsModal: React.FC<Props> = ({ category, onClose }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useCowActionDetails(category);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    if (category) setShowAll(false);
  }, [category]);

  if (!category) return null;
  const meta = META[category];
  const rows = data ?? [];
  const visible = showAll ? rows : rows.slice(0, 20);

  return (
    <Dialog open={!!category} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className={cn('text-xl', meta.tone)}>
            {meta.title} {!isLoading && <span className="text-muted-foreground font-normal">({rows.length})</span>}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nothing here. All clear!
            </div>
          ) : (
            <ul className="divide-y border rounded-md">
              {visible.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Cow #{r.cowNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.primaryLabel}
                      {r.primaryDate ? ` · ${formatDate(new Date(r.primaryDate))}` : ''}
                    </div>
                  </div>
                  {r.daysLabel && (
                    <div className="text-right shrink-0 ml-3">
                      <div className={cn('font-semibold', meta.tone)}>{r.daysValue}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {r.daysLabel}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!isLoading && rows.length > 20 && !showAll && (
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowAll(true)}>
              Show all {rows.length}
            </Button>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/ai-tracking?filter=${meta.routeFilter}`);
            }}
          >
            Open in AI Tracking <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
