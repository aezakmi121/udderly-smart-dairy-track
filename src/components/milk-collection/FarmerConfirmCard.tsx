import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, UserCheck, History } from 'lucide-react';
import { formatDateDMY, SESSION_HINDI } from '@/lib/farmerFormat';
import {
  findTrueDuplicate,
  quantityLooksUnusual,
  type CollectionLike,
  type DeliveryHabit,
} from '@/lib/collectionGuards';

interface FarmerConfirmCardProps {
  farmerName: string;
  farmerCode: string;
  habit: DeliveryHabit;
  lastDelivery: CollectionLike | null;
  sameSession: CollectionLike[];
  candidate: CollectionLike | null;
  editingId?: string | null;
}

/**
 * Who the milk is being credited to, large enough to read across a counter.
 *
 * Wrong member code is the live problem, and the reason it survives is that the
 * name was previously small grey text under the code box. Nothing else on the
 * entry looks wrong -- the quantity is plausible, the rate is right, the
 * arithmetic is right. Only the name is wrong, and nobody read it.
 *
 * The last delivery sits under the name because it is the cheapest possible
 * check: the operator glances at it, sees a farmer who brings six litres of
 * buffalo milk, and the twenty litres of cow milk in front of them stops making
 * sense before the entry is saved rather than after the slip is printed.
 */
export const FarmerConfirmCard: React.FC<FarmerConfirmCardProps> = ({
  farmerName,
  farmerCode,
  habit,
  lastDelivery,
  sameSession,
  candidate,
  editingId,
}) => {
  const duplicate = candidate
    ? findTrueDuplicate(sameSession, { ...candidate, id: editingId ?? candidate.id })
    : null;

  const unusual =
    candidate && !duplicate ? quantityLooksUnusual(Number(candidate.quantity), habit) : false;

  // Editing a row that is already in this session is not a second delivery.
  const others = sameSession.filter((r) => r.id !== editingId);

  return (
    <div className="space-y-2">
      <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5" /> Recording for
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
          <span className="text-2xl font-bold leading-tight">{farmerName}</span>
          <Badge variant="outline" className="text-sm tabular-nums">
            {farmerCode}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          {lastDelivery ? (
            <span className="flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              Last {formatDateDMY(lastDelivery.collection_date)}{' '}
              {SESSION_HINDI[lastDelivery.session === 'evening' ? 'evening' : 'morning']} ·{' '}
              {Number(lastDelivery.quantity).toFixed(2)} L · Fat{' '}
              {Number(lastDelivery.fat_percentage).toFixed(1)}
              {lastDelivery.species ? ` · ${lastDelivery.species}` : ''}
            </span>
          ) : (
            <span>No previous collection recorded</span>
          )}
          {habit.deliveries > 0 && (
            <span>
              Usually {habit.medianQuantity.toFixed(2)} L over {habit.deliveries} deliveries
            </span>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Already recorded this session:{' '}
          {others
            .map(
              (r) =>
                `${Number(r.quantity).toFixed(2)} L${r.species ? ` ${r.species}` : ''} (Fat ${Number(
                  r.fat_percentage
                ).toFixed(1)})`
            )
            .join(', ')}
        </p>
      )}

      {/* Same quantity to the millilitre, same fat and same SNF. Two buckets
          from one farmer differ in at least one of those. */}
      {duplicate && (
        <Alert variant="destructive">
          <Copy className="h-4 w-4" />
          <AlertDescription>
            <strong>Already entered.</strong> {Number(duplicate.quantity).toFixed(2)} L at Fat{' '}
            {Number(duplicate.fat_percentage).toFixed(1)} / SNF{' '}
            {Number(duplicate.snf_percentage).toFixed(1)} is already recorded for this farmer in
            this session. Save again only if they genuinely delivered twice.
          </AlertDescription>
        </Alert>
      )}

      {unusual && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {Number(candidate!.quantity).toFixed(2)} L is well away from this farmer's usual{' '}
            {habit.medianQuantity.toFixed(2)} L. Check the code is right.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
