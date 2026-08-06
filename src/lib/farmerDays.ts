import type { SessionKey } from './farmerFormat';

/**
 * A single delivery, as the farmer-facing screens need it.
 *
 * This is deliberately a subset of `milk_collections`: the columns a farmer
 * would recognise from the paper slip, and nothing else.
 */
export interface FarmerCollection {
  id?: string | null;
  collection_date: string;
  session: SessionKey;
  quantity: number;
  fat_percentage: number;
  snf_percentage: number;
  rate_per_liter: number;
  total_amount: number;
  species?: string | null;
  is_accepted?: boolean | null;
  remarks?: string | null;
  created_at?: string | null;
}

export interface SessionGroup {
  session: SessionKey;
  /** Every delivery in this session, in the order they were brought in. */
  entries: FarmerCollection[];
  /** Accepted litres only. Rejected milk was never bought. */
  litres: number;
  /** Accepted money only. */
  amount: number;
  rejectedCount: number;
}

export interface DayGroup {
  date: string;
  morning: SessionGroup;
  evening: SessionGroup;
  litres: number;
  amount: number;
  /** Accepted deliveries across both sessions — what "2 बार" counts. */
  acceptedCount: number;
  rejectedCount: number;
}

const num = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/** A rejected sample is anything explicitly marked not accepted. */
export const isRejected = (row: FarmerCollection): boolean => row.is_accepted === false;

const emptySession = (session: SessionKey): SessionGroup => ({
  session,
  entries: [],
  litres: 0,
  amount: 0,
  rejectedCount: 0,
});

/** Earliest first, so two buckets in one session read in the order delivered. */
const byArrival = (a: FarmerCollection, b: FarmerCollection): number => {
  const ta = a.created_at ? Date.parse(a.created_at) : NaN;
  const tb = b.created_at ? Date.parse(b.created_at) : NaN;
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return ta - tb;
};

/**
 * Fold a flat list of collections into one entry per day, split by session.
 *
 * Days come back newest first, which is the order a farmer scrolls. A farmer
 * who brings a bucket of cow milk and a bucket of buffalo milk to the same
 * session gets two entries in that session — they got two slips, so merging
 * them would make the screen disagree with the paper.
 */
export const groupByDay = (rows: FarmerCollection[] | null | undefined): DayGroup[] => {
  const days = new Map<string, DayGroup>();

  for (const row of rows ?? []) {
    if (!row?.collection_date) continue;
    const date = row.collection_date.slice(0, 10);

    let day = days.get(date);
    if (!day) {
      day = {
        date,
        morning: emptySession('morning'),
        evening: emptySession('evening'),
        litres: 0,
        amount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
      };
      days.set(date, day);
    }

    // Anything that is not explicitly the evening belongs to the morning; an
    // unreadable session value should still show the milk somewhere.
    const group = row.session === 'evening' ? day.evening : day.morning;
    group.entries.push(row);

    if (isRejected(row)) {
      group.rejectedCount += 1;
      day.rejectedCount += 1;
    } else {
      group.litres += num(row.quantity);
      group.amount += num(row.total_amount);
      day.litres += num(row.quantity);
      day.amount += num(row.total_amount);
      day.acceptedCount += 1;
    }
  }

  const out = [...days.values()];
  for (const day of out) {
    day.morning.entries.sort(byArrival);
    day.evening.entries.sort(byArrival);
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
};

/** Today as a `YYYY-MM-DD` calendar day in the reader's own timezone. */
export const todayISO = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** The day a farmer should land on: today if there is milk, else the latest. */
export const pickLatestDay = (
  days: DayGroup[],
  now: Date = new Date()
): DayGroup | null => {
  if (days.length === 0) return null;
  const today = todayISO(now);
  return days.find((d) => d.date === today) ?? days[0];
};
