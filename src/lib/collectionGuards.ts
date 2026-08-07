/**
 * Checks that run before a collection is saved.
 *
 * The live problem is the wrong member code: milk credited to the wrong farmer
 * because four digits were mistyped. Nothing downstream catches it -- the
 * quantity is plausible, the rate is right, the arithmetic is right. Only the
 * name is wrong, and nobody reads the name.
 */

export interface CollectionLike {
  id?: string | null;
  quantity: number;
  fat_percentage: number;
  snf_percentage: number;
  collection_date?: string;
  session?: string;
  species?: string | null;
  created_at?: string | null;
}

/** Quantities are recorded to 3 places, fat and SNF to 1. */
const QTY_EPSILON = 0.0005;
const PERCENT_EPSILON = 0.05;

const close = (a: unknown, b: unknown, epsilon: number): boolean =>
  Math.abs(Number(a ?? NaN) - Number(b ?? NaN)) < epsilon;

/**
 * Two entries that are the same measurement, not merely the same farmer.
 *
 * A farmer bringing a bucket of cow milk and a bucket of buffalo milk to one
 * session is ordinary and must not be flagged. What cannot happen twice is the
 * identical quantity to the millilitre *and* the same fat *and* the same SNF --
 * that is the same bucket weighed once and entered twice.
 */
export const isTrueDuplicate = (a: CollectionLike, b: CollectionLike): boolean =>
  close(a.quantity, b.quantity, QTY_EPSILON) &&
  close(a.fat_percentage, b.fat_percentage, PERCENT_EPSILON) &&
  close(a.snf_percentage, b.snf_percentage, PERCENT_EPSILON);

/** The first entry already recorded that repeats this measurement exactly. */
export const findTrueDuplicate = (
  existing: CollectionLike[] | null | undefined,
  candidate: CollectionLike
): CollectionLike | null => {
  for (const row of existing ?? []) {
    // Editing a row is not duplicating it.
    if (candidate.id && row.id === candidate.id) continue;
    if (isTrueDuplicate(row, candidate)) return row;
  }
  return null;
};

export interface DeliveryHabit {
  deliveries: number;
  medianQuantity: number;
}

/**
 * What this farmer usually brings.
 *
 * Median rather than mean: one mistyped 60-litre entry in the history would
 * drag an average far enough to hide the next mistake.
 */
export const summariseHabit = (history: CollectionLike[] | null | undefined): DeliveryHabit => {
  const quantities = (history ?? [])
    .map((r) => Number(r.quantity))
    .filter((q) => Number.isFinite(q) && q > 0)
    .sort((a, b) => a - b);

  if (quantities.length === 0) return { deliveries: 0, medianQuantity: 0 };
  const mid = Math.floor(quantities.length / 2);
  const median =
    quantities.length % 2 === 0
      ? (quantities[mid - 1] + quantities[mid]) / 2
      : quantities[mid];
  return { deliveries: quantities.length, medianQuantity: median };
};

/** Below this many past deliveries there is no habit to compare against. */
export const MIN_HISTORY_FOR_HABIT = 4;
/** How far from the usual quantity is worth a second look. */
export const UNUSUAL_FACTOR = 2.5;

/**
 * Is this quantity unlike what the farmer normally brings?
 *
 * A wrong code usually shows up here: the amount is right for whoever actually
 * handed over the milk and wrong for whoever the code belongs to. It is a hint,
 * never a block -- a farmer who buys another buffalo doubles his delivery
 * legitimately, and being nagged about it teaches operators to ignore warnings.
 */
export const quantityLooksUnusual = (quantity: number, habit: DeliveryHabit): boolean => {
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) return false;
  if (habit.deliveries < MIN_HISTORY_FOR_HABIT || habit.medianQuantity <= 0) return false;
  return q > habit.medianQuantity * UNUSUAL_FACTOR || q < habit.medianQuantity / UNUSUAL_FACTOR;
};

/** Matches fn_collection_undo_window() in the database, which is what enforces it. */
export const UNDO_WINDOW_MS = 15 * 60 * 1000;

/** Milliseconds of undo left, or 0 once it has run out. */
export const undoRemainingMs = (
  createdAt: string | null | undefined,
  now: Date = new Date()
): number => {
  if (!createdAt) return 0;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, t + UNDO_WINDOW_MS - now.getTime());
};

export const canUndo = (createdAt: string | null | undefined, now: Date = new Date()): boolean =>
  undoRemainingMs(createdAt, now) > 0;

/** `4:05` — a countdown an operator can read at a glance. */
export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};
