import { describe, it, expect } from 'vitest';
import {
  cycleState,
  canServeAgain,
  latestRecord,
  expectedDeliveryDate,
  contradictsDelivery,
  DEFAULT_GESTATION_DAYS,
  type CycleRecord,
} from './aiCycle';

const rec = (over: Partial<CycleRecord> = {}): CycleRecord => ({
  ai_date: '2026-01-10',
  pd_done: false,
  pd_result: null,
  actual_delivery_date: null,
  ...over,
});

describe('what state a cycle is in', () => {
  it('is awaiting PD once served', () => {
    expect(cycleState(rec())).toBe('awaiting_pd');
  });

  it('is pregnant on a positive PD', () => {
    expect(cycleState(rec({ pd_done: true, pd_result: 'positive' }))).toBe('pregnant');
  });

  it('is open on a negative PD', () => {
    expect(cycleState(rec({ pd_done: true, pd_result: 'negative' }))).toBe('open');
  });

  // Inconclusive means she is not confirmed pregnant, so she is servable.
  it('is open on an inconclusive PD', () => {
    expect(cycleState(rec({ pd_done: true, pd_result: 'inconclusive' }))).toBe('open');
  });

  it('is delivered once a calving date exists', () => {
    expect(cycleState(rec({ pd_done: true, pd_result: 'positive', actual_delivery_date: '2026-10-22' }))).toBe('delivered');
  });

  // Seven rows in production say delivered AND PD negative, because the
  // delivery flows never revisit a PD that was called too early. Reality wins.
  it('trusts the calving over a PD that contradicts it', () => {
    expect(cycleState(rec({ pd_done: true, pd_result: 'negative', actual_delivery_date: '2025-08-24' }))).toBe('delivered');
  });

  it('has no state at all for a cow never served', () => {
    expect(cycleState(null)).toBeNull();
    expect(cycleState(undefined)).toBeNull();
  });
});

describe('may she be served again', () => {
  it('allows a cow that has never been served', () => {
    expect(canServeAgain(null)).toEqual({ allowed: true, reason: 'first_service' });
  });

  // The bug this file exists for: ten cows who had calved were refused their
  // next service because their PD still read positive.
  it('allows a cow who has calved', () => {
    const decision = canServeAgain(
      rec({ pd_done: true, pd_result: 'positive', actual_delivery_date: '2026-08-04' })
    );
    expect(decision).toEqual({ allowed: true, reason: 'after_calving' });
  });

  it('allows a cow who came back empty', () => {
    expect(canServeAgain(rec({ pd_done: true, pd_result: 'negative' })).allowed).toBe(true);
  });

  it('refuses a cow still carrying', () => {
    expect(canServeAgain(rec({ pd_done: true, pd_result: 'positive' }))).toEqual({
      allowed: false,
      reason: 'pregnant',
    });
  });

  it('refuses until the PD is recorded, and says which', () => {
    expect(canServeAgain(rec())).toEqual({ allowed: false, reason: 'awaiting_pd' });
  });

  it('gives a reason the screen can act on, not a sentence', () => {
    // The old code returned a paragraph of prose, so the UI could only show it.
    expect(typeof canServeAgain(rec()).reason).toBe('string');
    expect(canServeAgain(rec()).reason).not.toContain(' ');
  });
});

describe('which record decides', () => {
  it('takes the most recent service', () => {
    const records = [
      { ai_date: '2025-11-28' },
      { ai_date: '2026-03-21' },
      { ai_date: '2025-12-29' },
    ];
    expect(latestRecord(records)?.ai_date).toBe('2026-03-21');
  });

  // Two services entered for the same day should resolve to the one added
  // last, not to whichever the database happened to return first.
  it('breaks a same-day tie by when the row was written', () => {
    const records = [
      { ai_date: '2026-03-21', created_at: '2026-03-21T06:00:00Z', pd_result: 'negative' as const },
      { ai_date: '2026-03-21', created_at: '2026-03-21T18:00:00Z', pd_result: 'positive' as const },
    ];
    expect(latestRecord(records)?.pd_result).toBe('positive');
  });

  it('copes with a missing timestamp rather than dropping the row', () => {
    const records = [{ ai_date: '2026-03-21' }, { ai_date: '2026-03-21', created_at: '2026-03-21T18:00:00Z' }];
    expect(latestRecord(records)).not.toBeNull();
  });

  it('skips a row with no service date', () => {
    expect(latestRecord([{ ai_date: '' }, { ai_date: '2026-01-01' }])?.ai_date).toBe('2026-01-01');
  });

  it('has nothing to decide from an empty history', () => {
    expect(latestRecord([])).toBeNull();
    expect(latestRecord(null)).toBeNull();
  });
});

describe('expected calving date', () => {
  it('adds the gestation length to the service date', () => {
    expect(expectedDeliveryDate('2026-01-10', 285)).toBe('2026-10-22');
  });

  // Every one of the 51 stored records was built with 285, so that stays the
  // default; changing it silently would move dates the farm already works to.
  it('defaults to what the existing records were built with', () => {
    expect(DEFAULT_GESTATION_DAYS).toBe(285);
    expect(expectedDeliveryDate('2026-01-10')).toBe(expectedDeliveryDate('2026-01-10', 285));
  });

  it('honours a farm that sets a different length', () => {
    expect(expectedDeliveryDate('2026-01-10', 283)).toBe('2026-10-20');
  });

  it('crosses a leap day correctly', () => {
    expect(expectedDeliveryDate('2028-01-01', 60)).toBe('2028-03-01');
  });

  // Built from parts rather than through UTC, so a phone west of London does
  // not shift every calving date by a day.
  it('is not moved by the reader timezone', () => {
    expect(expectedDeliveryDate('2026-01-10', 1)).toBe('2026-01-11');
  });

  it('returns nothing for an unusable date instead of Invalid Date', () => {
    expect(expectedDeliveryDate('not a date')).toBe('');
  });
});

describe('spotting the contradictory rows', () => {
  it('flags a calving recorded against a negative PD', () => {
    expect(contradictsDelivery(rec({ pd_done: true, pd_result: 'negative', actual_delivery_date: '2025-08-24' }))).toBe(true);
  });

  it('flags a calving with no PD done at all', () => {
    expect(contradictsDelivery(rec({ pd_done: false, actual_delivery_date: '2025-08-24' }))).toBe(true);
  });

  it('leaves a consistent record alone', () => {
    expect(contradictsDelivery(rec({ pd_done: true, pd_result: 'positive', actual_delivery_date: '2025-08-24' }))).toBe(false);
  });

  it('says nothing about a cow who has not calved', () => {
    expect(contradictsDelivery(rec({ pd_done: true, pd_result: 'negative' }))).toBe(false);
  });
});
