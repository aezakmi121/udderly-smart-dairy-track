import { describe, it, expect } from 'vitest';
import { groupByDay, pickLatestDay, todayISO, type FarmerCollection } from './farmerDays';

const row = (over: Partial<FarmerCollection> = {}): FarmerCollection => ({
  collection_date: '2026-08-05',
  session: 'morning',
  quantity: 6.5,
  fat_percentage: 4.2,
  snf_percentage: 8.4,
  rate_per_liter: 84.4,
  total_amount: 548.6,
  species: 'Cow',
  is_accepted: true,
  ...over,
});

describe('grouping deliveries into days', () => {
  it('puts a morning and an evening delivery on one day', () => {
    const days = groupByDay([row(), row({ session: 'evening', total_amount: 505.49, quantity: 6 })]);
    expect(days).toHaveLength(1);
    expect(days[0].morning.entries).toHaveLength(1);
    expect(days[0].evening.entries).toHaveLength(1);
    expect(days[0].amount).toBeCloseTo(1054.09, 2);
    expect(days[0].litres).toBeCloseTo(12.5, 2);
    expect(days[0].acceptedCount).toBe(2);
  });

  it('shows the newest day first, which is the way a farmer scrolls', () => {
    const days = groupByDay([
      row({ collection_date: '2026-07-30' }),
      row({ collection_date: '2026-08-05' }),
      row({ collection_date: '2026-08-01' }),
    ]);
    expect(days.map((d) => d.date)).toEqual(['2026-08-05', '2026-08-01', '2026-07-30']);
  });

  // He brings one bucket of cow and one of buffalo. Two slips were printed, so
  // merging them would make the screen disagree with the paper in his hand.
  it('keeps two buckets in one session as two entries', () => {
    const days = groupByDay([
      row({ species: 'Cow', quantity: 6, total_amount: 500 }),
      row({ species: 'Buffalo', quantity: 4, total_amount: 400 }),
    ]);
    expect(days[0].morning.entries).toHaveLength(2);
    expect(days[0].morning.litres).toBeCloseTo(10, 2);
    expect(days[0].morning.amount).toBeCloseTo(900, 2);
  });

  it('orders deliveries within a session by when they were brought in', () => {
    const days = groupByDay([
      row({ species: 'Buffalo', created_at: '2026-08-05T07:10:00Z' }),
      row({ species: 'Cow', created_at: '2026-08-05T06:42:00Z' }),
    ]);
    expect(days[0].morning.entries.map((e) => e.species)).toEqual(['Cow', 'Buffalo']);
  });

  it('does not fall over when rows have no timestamp', () => {
    const days = groupByDay([row({ species: 'Cow' }), row({ species: 'Buffalo' })]);
    expect(days[0].morning.entries).toHaveLength(2);
  });

  it('leaves a session empty rather than inventing a zero delivery', () => {
    const days = groupByDay([row({ session: 'morning' })]);
    expect(days[0].evening.entries).toEqual([]);
    expect(days[0].evening.amount).toBe(0);
  });
});

describe('rejected milk', () => {
  // It has to be visible — hiding it is what starts the argument at the counter
  // — but it must not be counted as earnings, because it was never bought.
  it('is listed but kept out of the money and the litres', () => {
    const days = groupByDay([
      row({ quantity: 6, total_amount: 500 }),
      row({ session: 'evening', is_accepted: false, quantity: 5, total_amount: 0, remarks: 'खट्टा दूध' }),
    ]);
    expect(days[0].evening.entries).toHaveLength(1);
    expect(days[0].amount).toBeCloseTo(500, 2);
    expect(days[0].litres).toBeCloseTo(6, 2);
    expect(days[0].acceptedCount).toBe(1);
    expect(days[0].rejectedCount).toBe(1);
  });

  it('treats a missing acceptance flag as accepted, the way old rows are', () => {
    const days = groupByDay([row({ is_accepted: null, total_amount: 500 })]);
    expect(days[0].amount).toBeCloseTo(500, 2);
    expect(days[0].rejectedCount).toBe(0);
  });
});

describe('bad input', () => {
  it('survives no data at all', () => {
    expect(groupByDay(null)).toEqual([]);
    expect(groupByDay([])).toEqual([]);
  });

  it('skips a row with no date instead of making a day called undefined', () => {
    const days = groupByDay([row({ collection_date: '' }), row()]);
    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-08-05');
  });

  it('trims a timestamp down to its calendar day', () => {
    const days = groupByDay([row({ collection_date: '2026-08-05T00:00:00Z' }), row()]);
    expect(days).toHaveLength(1);
  });

  it('shows milk with an unreadable session rather than dropping it', () => {
    const days = groupByDay([row({ session: 'unknown' as never, total_amount: 500 })]);
    expect(days[0].morning.entries).toHaveLength(1);
    expect(days[0].amount).toBeCloseTo(500, 2);
  });

  it('does not turn a missing amount into NaN', () => {
    const days = groupByDay([row({ total_amount: null as never, quantity: undefined as never })]);
    expect(days[0].amount).toBe(0);
    expect(days[0].litres).toBe(0);
  });
});

describe('which day to open on', () => {
  const now = new Date(2026, 7, 5);

  it('names today as a calendar day in the reader own timezone', () => {
    expect(todayISO(now)).toBe('2026-08-05');
    expect(todayISO(new Date(2026, 0, 7))).toBe('2026-01-07');
  });

  it('opens on today when milk was delivered today', () => {
    const days = groupByDay([row({ collection_date: '2026-08-05' }), row({ collection_date: '2026-08-04' })]);
    expect(pickLatestDay(days, now)?.date).toBe('2026-08-05');
  });

  // Before the morning weighing is entered there is no row for today at all.
  // Showing an empty screen would look like the milk went missing.
  it('falls back to the most recent day when today has nothing yet', () => {
    const days = groupByDay([row({ collection_date: '2026-08-04' })]);
    expect(pickLatestDay(days, now)?.date).toBe('2026-08-04');
  });

  it('has nothing to open for a farmer with no collections', () => {
    expect(pickLatestDay([], now)).toBeNull();
  });
});
