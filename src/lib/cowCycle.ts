import { cycleState, type CycleRecord } from './aiCycle';

/**
 * Where a cow is in her lactation, read across her whole record history.
 *
 * The board decides a cow's *stage* from her latest record alone, which is
 * correct -- but it means the calving is invisible the moment she is served
 * again, because the calving lives on the previous record. So a cow listed
 * under "PD due" could not be told when she last calved, and one that had just
 * calved was shown a service date.
 *
 * Days open and services this lactation are the two numbers a breeding board
 * exists for, and neither can be had from a single row.
 */
export interface CowCycle {
  /** Most recent recorded calving, across every record she has. */
  lastCalvingDate: string | null;
  /** Days since that calving. Null if she has never calved here. */
  daysInMilk: number | null;
  /**
   * Days since calving while she is still not carrying. Null once she is
   * confirmed pregnant -- the clock stops at conception, not at calving.
   */
  daysOpen: number | null;
  /** Services since that calving. Her whole history if she has never calved. */
  servicesThisLactation: number;
}

const day = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetween = (from: string, to: Date): number | null => {
  const d = day(from);
  if (!d) return null;
  const midnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((midnight.getTime() - d.getTime()) / 86400000);
};

export type CycleHistoryRecord = CycleRecord & { created_at?: string | null };

/**
 * Build the summary from every record a cow has, newest or oldest order alike.
 */
export const buildCowCycle = (
  records: CycleHistoryRecord[] | null | undefined,
  latest: CycleHistoryRecord | null | undefined,
  today: Date = new Date()
): CowCycle => {
  const all = (records ?? []).filter((r) => r?.ai_date);

  let lastCalvingDate: string | null = null;
  for (const r of all) {
    const calved = r.actual_delivery_date ? String(r.actual_delivery_date).slice(0, 10) : null;
    if (calved && (!lastCalvingDate || calved > lastCalvingDate)) lastCalvingDate = calved;
  }

  const daysInMilk = lastCalvingDate ? daysBetween(lastCalvingDate, today) : null;

  // Once she is carrying, the open period is closed -- reporting a growing
  // "days open" for a pregnant cow is the classic way to make the number
  // useless.
  const carrying = cycleState(latest) === 'pregnant';
  const daysOpen = carrying ? null : daysInMilk;

  // A service *after* the last calving belongs to this lactation. With no
  // calving on file, everything she has is this lactation.
  const servicesThisLactation = lastCalvingDate
    ? all.filter((r) => String(r.ai_date).slice(0, 10) > lastCalvingDate!).length
    : all.length;

  return { lastCalvingDate, daysInMilk, daysOpen, servicesThisLactation };
};

/** An empty summary, for a cow with nothing on file. */
export const EMPTY_COW_CYCLE: CowCycle = {
  lastCalvingDate: null,
  daysInMilk: null,
  daysOpen: null,
  servicesThisLactation: 0,
};
