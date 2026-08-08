import { describe, it, expect } from 'vitest';
import {
  isTrueDuplicate,
  findTrueDuplicate,
  summariseHabit,
  quantityLooksUnusual,
  undoRemainingMs,
  canUndo,
  formatCountdown,
  UNDO_WINDOW_MS,
  MIN_HISTORY_FOR_HABIT,
  type CollectionLike,
} from './collectionGuards';

const entry = (over: Partial<CollectionLike> = {}): CollectionLike => ({
  quantity: 6.5,
  fat_percentage: 4.2,
  snf_percentage: 8.4,
  ...over,
});

describe('spotting the same bucket entered twice', () => {
  it('matches an identical measurement', () => {
    expect(isTrueDuplicate(entry(), entry())).toBe(true);
  });

  // The case that must never be flagged: one bucket of cow, one of buffalo, in
  // the same session. Nagging about it teaches operators to ignore warnings.
  it('does not flag two different buckets from the same farmer', () => {
    expect(isTrueDuplicate(entry({ quantity: 6.5 }), entry({ quantity: 4.0 }))).toBe(false);
    expect(isTrueDuplicate(entry({ fat_percentage: 4.2 }), entry({ fat_percentage: 6.8 }))).toBe(false);
    expect(isTrueDuplicate(entry({ snf_percentage: 8.4 }), entry({ snf_percentage: 9.1 }))).toBe(false);
  });

  it('needs all three to match, not just the quantity', () => {
    expect(isTrueDuplicate(entry(), entry({ fat_percentage: 4.3 }))).toBe(false);
  });

  it('tolerates the precision the figures are actually stored at', () => {
    expect(isTrueDuplicate(entry({ quantity: 6.5 }), entry({ quantity: 6.5001 }))).toBe(true);
    expect(isTrueDuplicate(entry({ quantity: 6.5 }), entry({ quantity: 6.51 }))).toBe(false);
  });

  it('finds the offending entry among several', () => {
    const existing = [entry({ id: 'a', quantity: 4 }), entry({ id: 'b' }), entry({ id: 'c', quantity: 9 })];
    expect(findTrueDuplicate(existing, entry())?.id).toBe('b');
  });

  it('finds nothing when every entry differs', () => {
    expect(findTrueDuplicate([entry({ quantity: 4 }), entry({ quantity: 9 })], entry())).toBeNull();
  });

  // Correcting a typo on a saved row would otherwise flag the row against itself.
  it('does not flag a row being edited against itself', () => {
    const existing = [entry({ id: 'a' })];
    expect(findTrueDuplicate(existing, entry({ id: 'a' }))).toBeNull();
  });

  it('copes with no history at all', () => {
    expect(findTrueDuplicate(null, entry())).toBeNull();
    expect(findTrueDuplicate([], entry())).toBeNull();
  });
});

describe('what a farmer usually brings', () => {
  it('takes the middle value', () => {
    const habit = summariseHabit([6, 7, 8].map((q) => entry({ quantity: q })));
    expect(habit.medianQuantity).toBe(7);
    expect(habit.deliveries).toBe(3);
  });

  it('averages the middle pair when there is an even count', () => {
    expect(summariseHabit([6, 7, 8, 9].map((q) => entry({ quantity: q }))).medianQuantity).toBe(7.5);
  });

  // The reason it is a median: one mistyped 60 litre entry would drag a mean
  // far enough to hide the next mistake.
  it('is not dragged by a single wild entry', () => {
    const habit = summariseHabit([6, 6.5, 7, 6.2, 60].map((q) => entry({ quantity: q })));
    expect(habit.medianQuantity).toBeCloseTo(6.5, 2);
  });

  it('ignores rows with no usable quantity', () => {
    const habit = summariseHabit([
      entry({ quantity: 6 }),
      entry({ quantity: 0 }),
      entry({ quantity: NaN as never }),
    ]);
    expect(habit.deliveries).toBe(1);
  });

  it('reports nothing for a farmer with no history', () => {
    expect(summariseHabit([])).toEqual({ deliveries: 0, medianQuantity: 0 });
    expect(summariseHabit(null)).toEqual({ deliveries: 0, medianQuantity: 0 });
  });
});

describe('an amount unlike this farmer', () => {
  const regular = summariseHabit([6, 6.5, 7, 6.2, 6.8].map((q) => entry({ quantity: q })));

  it('accepts the usual amount without comment', () => {
    expect(quantityLooksUnusual(6.4, regular)).toBe(false);
    expect(quantityLooksUnusual(9, regular)).toBe(false);
  });

  it('notices a delivery far above the usual', () => {
    expect(quantityLooksUnusual(30, regular)).toBe(true);
  });

  it('notices one far below', () => {
    expect(quantityLooksUnusual(1, regular)).toBe(true);
  });

  // A new farmer has no habit, and guessing at one would flag every early
  // delivery until the operator stopped reading the warnings.
  it('stays quiet until there is enough history to judge', () => {
    const thin = summariseHabit(Array(MIN_HISTORY_FOR_HABIT - 1).fill(entry({ quantity: 6 })));
    expect(quantityLooksUnusual(30, thin)).toBe(false);
  });

  it('stays quiet on a nonsense quantity, which other checks handle', () => {
    expect(quantityLooksUnusual(0, regular)).toBe(false);
    expect(quantityLooksUnusual(NaN, regular)).toBe(false);
  });
});

describe('the undo window', () => {
  const now = new Date('2026-08-07T10:00:00Z');

  it('is open right after the entry was made', () => {
    expect(canUndo('2026-08-07T09:59:00Z', now)).toBe(true);
  });

  it('has closed once the window has passed', () => {
    expect(canUndo('2026-08-07T09:44:00Z', now)).toBe(false);
  });

  it('reports how much is left', () => {
    expect(undoRemainingMs('2026-08-07T09:55:00Z', now)).toBe(10 * 60 * 1000);
  });

  it('never reports a negative remainder', () => {
    expect(undoRemainingMs('2026-08-07T08:00:00Z', now)).toBe(0);
  });

  it('offers nothing for a row with no timestamp', () => {
    expect(canUndo(null, now)).toBe(false);
    expect(canUndo('not a date', now)).toBe(false);
  });

  // The database enforces the same fifteen minutes; a UI that disagreed would
  // either offer an undo that fails or hide one that would have worked.
  it('matches the window the database enforces', () => {
    expect(UNDO_WINDOW_MS).toBe(15 * 60 * 1000);
  });
});

describe('the countdown', () => {
  it('reads as minutes and seconds', () => {
    expect(formatCountdown(4 * 60 * 1000 + 5000)).toBe('4:05');
    expect(formatCountdown(59 * 1000)).toBe('0:59');
  });

  it('pads the seconds so the width never jumps', () => {
    expect(formatCountdown(60 * 1000 + 3000)).toBe('1:03');
  });

  it('bottoms out at zero', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5000)).toBe('0:00');
  });
});
