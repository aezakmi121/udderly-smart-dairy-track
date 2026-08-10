/**
 * What state a breeding cycle is in, and whether a cow may be served again.
 *
 * This was previously decided inline in two places that disagreed with each
 * other: `canAddAIRecord` refused a new service unless the last PD was
 * negative, while `getNextServiceNumber` correctly treated a calving as the end
 * of a cycle. The result was that every cow who had actually delivered was
 * locked out of her next service -- ten of them at the time this was written.
 */

export type CycleState =
  | 'awaiting_pd'   // served, too early or simply not checked yet
  | 'pregnant'      // PD positive, calf not yet born
  | 'open'          // PD negative or inconclusive; ready to serve again
  | 'delivered'     // she calved; this cycle is finished
  | 'failed';       // the service itself did not take place properly

export interface CycleRecord {
  ai_date: string;
  pd_done?: boolean | null;
  pd_result?: 'positive' | 'negative' | 'inconclusive' | null;
  actual_delivery_date?: string | null;
  ai_status?: string | null;
}

/**
 * A calving outranks everything else on the record.
 *
 * Seven rows in production say "delivered" and "PD negative" at once, because
 * both delivery flows write the calving date without revisiting a PD that was
 * called too early. Reading the delivery first means those rows behave
 * sensibly instead of according to a PD that reality has already overruled.
 */
export const cycleState = (record: CycleRecord | null | undefined): CycleState | null => {
  if (!record) return null;
  if (record.actual_delivery_date) return 'delivered';
  if (record.ai_status === 'failed') return 'failed';
  if (!record.pd_done) return 'awaiting_pd';
  if (record.pd_result === 'positive') return 'pregnant';
  return 'open';
};

export interface ServeDecision {
  allowed: boolean;
  /** Machine-readable so the UI can choose its own words and its own action. */
  reason: 'first_service' | 'after_calving' | 'open' | 'awaiting_pd' | 'pregnant' | 'failed';
}

/**
 * May this cow be served again, given her most recent record?
 *
 * Deliberately says nothing about *should* -- a cow that calved yesterday is
 * eligible as far as the records go, and the voluntary waiting period is a
 * separate warning rather than a block.
 */
export const canServeAgain = (latest: CycleRecord | null | undefined): ServeDecision => {
  const state = cycleState(latest);
  switch (state) {
    case null:
      return { allowed: true, reason: 'first_service' };
    case 'delivered':
      return { allowed: true, reason: 'after_calving' };
    case 'open':
      return { allowed: true, reason: 'open' };
    case 'failed':
      // The service did not happen, so there is nothing to wait for.
      return { allowed: true, reason: 'failed' };
    case 'awaiting_pd':
      return { allowed: false, reason: 'awaiting_pd' };
    case 'pregnant':
      return { allowed: false, reason: 'pregnant' };
  }
};

/**
 * The record that decides the cow's current state.
 *
 * Ordered by service date, then by insertion, so two services entered for the
 * same day resolve to the one added last rather than to whichever the database
 * happened to return first.
 */
export const latestRecord = <T extends CycleRecord & { created_at?: string | null }>(
  records: T[] | null | undefined
): T | null => {
  let best: T | null = null;
  for (const r of records ?? []) {
    if (!r?.ai_date) continue;
    if (!best) {
      best = r;
      continue;
    }
    if (r.ai_date > best.ai_date) {
      best = r;
    } else if (r.ai_date === best.ai_date) {
      const a = r.created_at ?? '';
      const b = best.created_at ?? '';
      if (a > b) best = r;
    }
  }
  return best;
};

/** Default gestation, matching every expected date already stored. */
export const DEFAULT_GESTATION_DAYS = 285;

export const expectedDeliveryDate = (
  aiDate: string,
  gestationDays: number = DEFAULT_GESTATION_DAYS
): string => {
  const d = new Date(`${aiDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + gestationDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * A calving and a negative PD cannot both be true.
 *
 * Used to flag the rows already in that state, and to stop the delivery flows
 * creating more of them.
 */
export const contradictsDelivery = (record: CycleRecord): boolean =>
  !!record.actual_delivery_date &&
  (record.pd_result === 'negative' || record.pd_done === false);
