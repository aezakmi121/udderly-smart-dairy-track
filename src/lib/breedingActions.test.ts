import { describe, it, expect } from 'vitest';
import { cowActions, groupHerd, ACTION_ORDER, ACTION_LABEL, type ActionInput } from './breedingActions';
import {
  DEFAULT_BREEDING_SETTINGS as S,
  normaliseBreedingSettings,
  PLAUSIBLE_GESTATION_MIN,
} from './breedingSettings';

const today = new Date(2026, 7, 10); // 10/08/2026

/** A service N days before today, with the matching expected calving date. */
const served = (daysAgo: number, over: Partial<ActionInput['record']> = {}): ActionInput => {
  const ai = new Date(today);
  ai.setDate(ai.getDate() - daysAgo);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const edd = new Date(ai);
  edd.setDate(edd.getDate() + S.gestationDays);
  return {
    record: {
      ai_date: iso(ai),
      pd_done: false,
      pd_result: null,
      actual_delivery_date: null,
      expected_delivery_date: iso(edd),
      ...over,
    },
  };
};

describe('watching for a return to heat', () => {
  // She cycles every ~21 days. Catching the return costs nothing and beats any
  // PD by a fortnight.
  it('flags her around three weeks after service', () => {
    expect(cowActions(served(21), S, today)).toContain('heat_watch');
  });

  it('is quiet too early and too late', () => {
    expect(cowActions(served(10), S, today)).not.toContain('heat_watch');
    expect(cowActions(served(30), S, today)).not.toContain('heat_watch');
  });

  it('says nothing once the PD is recorded', () => {
    expect(cowActions(served(21, { pd_done: true, pd_result: 'negative' }), S, today)).toEqual([]);
  });
});

describe('pregnancy checks', () => {
  it('comes due at the configured day', () => {
    expect(cowActions(served(S.pdDueFromDays), S, today)).toContain('pd_due');
    expect(cowActions(served(S.pdDueFromDays - 1), S, today)).not.toContain('pd_due');
  });

  it('becomes overdue rather than staying due', () => {
    const late = cowActions(served(S.pdOverdueAfterDays + 1), S, today);
    expect(late).toContain('pd_overdue');
    expect(late).not.toContain('pd_due');
  });

  // Cow 5 was served in March and still had no result in August.
  it('still chases a cow served months ago', () => {
    expect(cowActions(served(150), S, today)).toContain('pd_overdue');
  });

  it('drops both once a result is entered', () => {
    const done = cowActions(served(50, { pd_done: true, pd_result: 'negative' }), S, today);
    expect(done).not.toContain('pd_due');
    expect(done).not.toContain('pd_overdue');
  });
});

describe('calving and the move to milking', () => {
  const pregnant = (daysAgo: number, over = {}) =>
    served(daysAgo, { pd_done: true, pd_result: 'positive', ...over });

  it('lists her as due to calve inside the window', () => {
    expect(cowActions(pregnant(S.gestationDays - 10), S, today)).toContain('due_to_calve');
  });

  it('says to move her from the dry group about a month out', () => {
    expect(cowActions(pregnant(S.gestationDays - 25), S, today)).toContain('move_to_milking');
  });

  // The old board used 35 days for "about to deliver" while the farm moves cows
  // at 30, so the two lists were nearly identical and showed the same cows
  // twice under different headings.
  it('separates the two jobs instead of showing one cow twice', () => {
    const justMoving = cowActions(pregnant(S.gestationDays - 28), S, today);
    expect(justMoving).toContain('move_to_milking');
    expect(justMoving).not.toContain('due_to_calve');
  });

  it('stops asking once she has been moved', () => {
    const moved = { ...pregnant(S.gestationDays - 25), movedToMilking: true };
    expect(cowActions(moved, S, today)).not.toContain('move_to_milking');
  });

  it('flags a pregnancy that has run past its date', () => {
    expect(cowActions(pregnant(S.gestationDays + 5), S, today)).toContain('overdue_delivery');
  });

  it('does not also call an overdue cow due to calve', () => {
    expect(cowActions(pregnant(S.gestationDays + 5), S, today)).not.toContain('due_to_calve');
  });

  it('leaves a cow early in pregnancy alone', () => {
    expect(cowActions(pregnant(90), S, today)).toEqual([]);
  });
});

describe('records that cannot be true', () => {
  const calved = (aiDate: string, deliveryDate: string): ActionInput => ({
    record: {
      ai_date: aiDate,
      pd_done: true,
      pd_result: 'positive',
      actual_delivery_date: deliveryDate,
      expected_delivery_date: null,
    },
  });

  // The three real ones: 108, 321 and 472 days between service and calving.
  it('flags a calf that arrived impossibly early', () => {
    expect(cowActions(calved('2026-03-25', '2026-07-11'), S, today)).toContain('check_record');
  });

  it('flags one that arrived impossibly late', () => {
    expect(cowActions(calved('2025-04-25', '2026-08-10'), S, today)).toContain('check_record');
    expect(cowActions(calved('2025-05-20', '2026-04-06'), S, today)).toContain('check_record');
  });

  it('leaves a normal gestation alone', () => {
    expect(cowActions(calved('2025-10-21', '2026-08-02'), S, today)).toEqual([]);
  });

  it('allows the full natural spread without complaining', () => {
    // The herd's real range is 272-296 days.
    for (const days of [272, 285, 296]) {
      const ai = new Date(2025, 0, 1);
      const del = new Date(ai);
      del.setDate(del.getDate() + days);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      expect(cowActions(calved(iso(ai), iso(del)), S, today)).toEqual([]);
    }
  });

  it('draws the line outside normal variation', () => {
    expect(PLAUSIBLE_GESTATION_MIN).toBeLessThan(272);
  });
});

describe('a cow in two places at once', () => {
  it('appears in every group she belongs to', () => {
    // Close enough to calve and not yet moved: both jobs are real.
    const cow = served(S.gestationDays - 15, { pd_done: true, pd_result: 'positive' });
    const groups = cowActions(cow, S, today);
    expect(groups).toContain('due_to_calve');
    expect(groups).toContain('move_to_milking');
  });
});

describe('bucketing the herd', () => {
  it('puts each cow under every heading that applies', () => {
    const herd = [
      served(40),
      served(200),
      { ...served(S.gestationDays - 25, { pd_done: true, pd_result: 'positive' }) },
    ];
    const grouped = groupHerd(herd, S, today);
    expect(grouped.get('pd_due')).toHaveLength(1);
    expect(grouped.get('pd_overdue')).toHaveLength(1);
    expect(grouped.get('move_to_milking')).toHaveLength(1);
  });

  it('leaves a quiet herd with nothing to show', () => {
    expect(groupHerd([served(90, { pd_done: true, pd_result: 'positive' })], S, today).size).toBe(0);
  });

  it('has a label and a place in the order for every group', () => {
    for (const group of ACTION_ORDER) {
      expect(ACTION_LABEL[group]).toBeTruthy();
    }
    expect(new Set(ACTION_ORDER).size).toBe(ACTION_ORDER.length);
  });
});

describe('settings that would break the screen', () => {
  it('fills in anything missing', () => {
    expect(normaliseBreedingSettings({})).toEqual(S);
    expect(normaliseBreedingSettings(null)).toEqual(S);
  });

  it('keeps what was set', () => {
    expect(normaliseBreedingSettings({ pdDueFromDays: 45 }).pdDueFromDays).toBe(45);
  });

  // A due day later than the overdue day would leave cows in neither list.
  it('refuses a window that runs backwards', () => {
    const s = normaliseBreedingSettings({ pdDueFromDays: 90, pdOverdueAfterDays: 40 });
    expect(s.pdOverdueAfterDays).toBeGreaterThanOrEqual(s.pdDueFromDays);
  });

  it('ignores nonsense rather than producing NaN days', () => {
    const s = normaliseBreedingSettings({ gestationDays: 0, pdDueFromDays: -5, heatWatchToDays: 'x' });
    expect(s.gestationDays).toBe(S.gestationDays);
    expect(s.pdDueFromDays).toBe(S.pdDueFromDays);
    expect(s.heatWatchToDays).toBe(S.heatWatchToDays);
  });
});
