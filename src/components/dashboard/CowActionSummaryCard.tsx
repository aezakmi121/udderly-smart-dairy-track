import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useCowActionSummary } from '@/hooks/useCowActionSummary';
import { Stethoscope, CalendarClock, AlertTriangle, Syringe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CowActionDetailsModal } from './CowActionDetailsModal';
import type { ActionCategory } from '@/hooks/useCowActionDetails';

interface Tile {
  key: ActionCategory;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  iconTone: string;
}

export const CowActionSummaryCard: React.FC = () => {
  const { data, isLoading } = useCowActionSummary();
  const [openCategory, setOpenCategory] = useState<ActionCategory | null>(null);

  const tiles: Tile[] = [
    {
      key: 'pd-due',
      label: 'PD Due',
      count: data?.pdDue ?? 0,
      icon: Stethoscope,
      tone: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-amber-200 dark:border-amber-900',
      iconTone: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'close-delivery',
      label: 'Close to Delivery',
      count: data?.closeToDelivery ?? 0,
      icon: CalendarClock,
      tone: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border-blue-200 dark:border-blue-900',
      iconTone: 'text-blue-600 dark:text-blue-400',
    },
    {
      key: 'overdue-delivery',
      label: 'Overdue Delivery',
      count: data?.overdueDelivery ?? 0,
      icon: AlertTriangle,
      tone: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900',
      iconTone: 'text-red-600 dark:text-red-400',
    },
    {
      key: 'needs-ai',
      label: 'Needs AI',
      count: data?.needsAI ?? 0,
      icon: Syringe,
      tone: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-purple-200 dark:border-purple-900',
      iconTone: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <Card className="p-4 sm:p-6 border-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Action Required</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cows that need attention right now
          </p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setOpenCategory(t.key)}
              className={cn(
                'rounded-lg border-2 p-4 sm:p-5 text-left transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring',
                t.tone
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon className={cn('h-7 w-7 sm:h-8 sm:w-8', t.iconTone)} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold leading-none mb-1">
                {isLoading ? '…' : t.count}
              </div>
              <div className="text-sm sm:text-base font-medium text-muted-foreground">
                {t.label}
              </div>
            </button>
          );
        })}
      </div>

      <CowActionDetailsModal
        category={openCategory}
        onClose={() => setOpenCategory(null)}
      />
    </Card>
  );
};
