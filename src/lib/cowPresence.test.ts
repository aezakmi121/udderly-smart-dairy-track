import { describe, it, expect } from 'vitest';
import {
  isOnFarm,
  isGone,
  GONE_STATUSES,
  GONE_STATUS_FILTER,
  COW_STATUSES,
  COW_STATUS_LABEL,
  COW_EXIT_REASONS,
  COW_EXIT_REASON_LABEL,
  exitReasonsFor,
  statusTone,
} from './cowPresence';

describe('who is still on the farm', () => {
  it('counts a cow in unless she has left', () => {
    expect(isOnFarm('active')).toBe(true);
    expect(isGone('sold')).toBe(true);
    expect(isGone('dead')).toBe(true);
  });

  // The old code listed the statuses that counted as present, five different
  // ways across five hooks. Stated as an exclusion, a status nobody has
  // thought about yet leaves the cow visible instead of quietly dropping her
  // off screens no one would think to check.
  it('keeps an unrecognised status visible rather than hiding it', () => {
    expect(isOnFarm('dry')).toBe(true);
    expect(isOnFarm('pregnant')).toBe(true);
    expect(isOnFarm('sick')).toBe(true);
    expect(isOnFarm('some_future_status')).toBe(true);
  });

  it('treats a missing status as present', () => {
    expect(isOnFarm(null)).toBe(true);
    expect(isOnFarm(undefined)).toBe(true);
    expect(isOnFarm('')).toBe(true);
  });

  it('never says a cow is both here and gone', () => {
    for (const s of ['active', 'sold', 'dead', 'dry', 'pregnant', 'sick', '', null, undefined]) {
      expect(isOnFarm(s)).toBe(!isGone(s));
    }
  });
});

describe('the PostgREST filter matches the predicate', () => {
  // The list sent to the database and the check run in the browser have to
  // agree, or a cow is filtered out server-side and counted client-side.
  it('names exactly the statuses isGone rejects', () => {
    const inFilter = GONE_STATUS_FILTER.replace(/[()]/g, '').split(',');
    expect(inFilter.sort()).toEqual([...GONE_STATUSES].sort());
    for (const s of inFilter) expect(isGone(s)).toBe(true);
  });
});

describe('what the app offers', () => {
  it('offers active, sold and dead — and no condition statuses', () => {
    expect([...COW_STATUSES]).toEqual(['active', 'sold', 'dead']);
    expect(COW_STATUSES).not.toContain('dry');
    expect(COW_STATUSES).not.toContain('pregnant');
    expect(COW_STATUSES).not.toContain('sick');
  });

  it('still labels the legacy values, in case a row carries one', () => {
    for (const s of ['dry', 'pregnant', 'sick']) {
      expect(COW_STATUS_LABEL[s]).toBeTruthy();
    }
  });

  it('labels and colours every offered status', () => {
    for (const s of COW_STATUSES) {
      expect(COW_STATUS_LABEL[s]).toBeTruthy();
      expect(statusTone(s)).not.toBe(statusTone('unknown_status'));
    }
  });

  it('tells sold and dead apart visually', () => {
    expect(statusTone('sold')).not.toBe(statusTone('dead'));
  });
});

describe('why she left', () => {
  it('offers only reasons that fit the status', () => {
    expect(exitReasonsFor('sold')).toContain('sold');
    expect(exitReasonsFor('sold')).not.toContain('died_calving');
    expect(exitReasonsFor('dead')).toContain('died_calving');
    expect(exitReasonsFor('dead')).not.toContain('sold');
  });

  it('always leaves a way out', () => {
    expect(exitReasonsFor('sold')).toContain('other');
    expect(exitReasonsFor('dead')).toContain('other');
  });

  it('labels every reason, and offers no reason it cannot label', () => {
    for (const r of COW_EXIT_REASONS) expect(COW_EXIT_REASON_LABEL[r]).toBeTruthy();
    for (const status of ['sold', 'dead']) {
      for (const r of exitReasonsFor(status)) {
        expect(COW_EXIT_REASONS).toContain(r);
      }
    }
  });
});
