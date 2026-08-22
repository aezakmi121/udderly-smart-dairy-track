import { describe, it, expect } from 'vitest';
import {
  cowStage,
  cowBadges,
  groupHerd,
  hasImpossibleGestation,
  ACTION_ORDER,
  INFO_ORDER,
  ALL_STAGES,
  ACTION_LABEL,
  type ActionInput,
} from './breedingActions';
import { buildCowCycle } from './cowCycle';
import {
  DEFAULT_BREEDING_SETTINGS as S,
  normaliseBreedingSettings,
  PLAUSIBLE_GESTATION_MIN,
} from './breedingSettings';

const today = new Date(2026, 7, 10); // 10/08/2026
const iso = (d: Date) => d.toISOString().slice(0, 10);

const shift = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d;
};

/** A service N days before today, with the matching expected calving date. */
const served = (daysAgo: number, over: Partial<ActionInput['record']> = {}): ActionInput => {
  const ai = shift(daysAgo);
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

const pregnant = (daysAgo: number, over: Partial<ActionInput['record']> = {}) =>
  served(daysAgo, { pd_done: true, pd_result: 'positive', ...over });

/** She calved N days ago, from a service one gestation before that. */
const calvedDaysAgo = (n: number, over: Partial<ActionInput> = {}): ActionInput => ({
  ...served(S.gestationDays + n, {
    pd_done: true,
    pd_result: 'positive',
    actual_delivery_date: iso(shift(n)),
  }),
  ...over,
});

describe('one cow, one heading', () => {
  it('puts every state somewhere', () => {
    const cows: ActionInput[] = [
      served(5),                                                  // served_waiting
      served(21),                                                 // heat_watch
      served(40),                                                 // pd_due
      served(90),                                                 // pd_overdue
      served(40, { pd_done: true, pd_result: 'negative' }),        // not_pregnant
      pregnant(100),                                              // pregnant_on_track
      pregnant(S.gestationDays - 25),                             // move_to_milking
      pregnant(S.gestationDays - 10),                             // due_to_calve
      pregnant(S.gestationDays + 5),                              // overdue_delivery
      calvedDaysAgo(10),                                          // recently_calved
      calvedDaysAgo(200),                                         // ready_to_serve
    ];
    for (const cow of cows) {
      expect(cowStage(cow, S, today)).not.toBeNull();
    }
  });

  it('never lists a cow under two headings', () => {
    // A cow ten days out both is due to calve and needs moving. She belongs to
    // the more urgent heading and carries the other as a badge -- listing her
    // twice is what made the board hard to read.
    const cow = pregnant(S.gestationDays - 10);
    expect(cowStage(cow, S, today)).toBe('due_to_calve');
    expect(cowBadges(cow, S, today)).toContain('needs_move');
  });

  it('accounts for the whole herd', () => {
    const herd = [served(5), served(40), pregnant(100), calvedDaysAgo(200)];
    const grouped = groupHerd(herd, S, today);
    expect(grouped.placed).toBe(herd.length);
    expect(grouped.unplaced).toBe(0);
    const summed = ALL_STAGES.reduce((n, g) => n + (grouped.stages.get(g)?.length ?? 0), 0);
    expect(summed).toBe(herd.length);
  });

  it('every stage has a heading and sits in exactly one tier', () => {
    for (const stage of ALL_STAGES) {
      expect(ACTION_LABEL[stage]).toBeTruthy();
    }
    for (const stage of ACTION_ORDER) expect(INFO_ORDER).not.toContain(stage);
    expect(new Set(ALL_STAGES).size).toBe(ALL_STAGES.length);
  });
});

describe('the two halves of what used to be "AI pending"', () => {
  // Cow 5 and 12 were confirmed not pregnant; 32 and 35 had just calved. They
  // were shown under one heading, with a service date for all four.
  it('sends an empty cow to Not pregnant', () => {
    expect(cowStage(served(40, { pd_done: true, pd_result: 'negative' }), S, today))
      .toBe('not_pregnant');
    expect(cowStage(served(40, { pd_done: true, pd_result: 'inconclusive' }), S, today))
      .toBe('not_pregnant');
    expect(cowStage(served(10, { ai_status: 'failed' }), S, today)).toBe('not_pregnant');
  });

  it('sends a calved cow to Recently calved, then Ready to serve', () => {
    expect(cowStage(calvedDaysAgo(S.serviceDueAfterCalvingDays - 1), S, today))
      .toBe('recently_calved');
    expect(cowStage(calvedDaysAgo(S.serviceDueAfterCalvingDays), S, today))
      .toBe('ready_to_serve');
  });

  it('moves her on without anyone touching a record', () => {
    // Same cow, same data — only the day changed.
    const cow = calvedDaysAgo(S.serviceDueAfterCalvingDays - 1);
    const laterToday = new Date(today);
    laterToday.setDate(laterToday.getDate() + 1);
    expect(cowStage(cow, S, today)).toBe('recently_calved');
    expect(cowStage(cow, S, laterToday)).toBe('ready_to_serve');
  });
});

describe('pregnancy checks', () => {
  it('comes due at the configured day', () => {
    expect(cowStage(served(S.pdDueFromDays), S, today)).toBe('pd_due');
    expect(cowStage(served(S.pdDueFromDays - 1), S, today)).not.toBe('pd_due');
  });

  it('turns overdue past the configured day', () => {
    expect(cowStage(served(S.pdOverdueAfterDays + 1), S, today)).toBe('pd_overdue');
    expect(cowStage(served(S.pdOverdueAfterDays), S, today)).toBe('pd_due');
  });

  it('still chases a cow served months ago', () => {
    expect(cowStage(served(150), S, today)).toBe('pd_overdue');
  });

  it('drops both once a result is entered', () => {
    const stage = cowStage(served(50, { pd_done: true, pd_result: 'negative' }), S, today);
    expect(stage).not.toBe('pd_due');
    expect(stage).not.toBe('pd_overdue');
  });
});

describe('watching for a return to heat', () => {
  it('flags her around three weeks after service', () => {
    expect(cowStage(served(21), S, today)).toBe('heat_watch');
  });

  it('is quiet too early and too late', () => {
    expect(cowStage(served(10), S, today)).toBe('served_waiting');
    expect(cowStage(served(30), S, today)).toBe('served_waiting');
  });
});

describe('calving and the move to milking', () => {
  it('lists her as due to calve inside the window', () => {
    expect(cowStage(pregnant(S.gestationDays - 10), S, today)).toBe('due_to_calve');
  });

  it('says to move her from the dry group about a month out', () => {
    expect(cowStage(pregnant(S.gestationDays - 25), S, today)).toBe('move_to_milking');
  });

  it('separates the two jobs instead of showing one cow twice', () => {
    const justMoving = cowStage(pregnant(S.gestationDays - 28), S, today);
    expect(justMoving).toBe('move_to_milking');
  });

  it('stops asking once she has been moved', () => {
    const moved = { ...pregnant(S.gestationDays - 25), movedToMilking: true };
    expect(cowStage(moved, S, today)).toBe('pregnant_on_track');
    expect(cowBadges(moved, S, today)).not.toContain('needs_move');
  });

  it('keeps a comfortably pregnant cow visible rather than invisible', () => {
    expect(cowStage(pregnant(100), S, today)).toBe('pregnant_on_track');
  });
});

describe('badges', () => {
  const withCycle = (cow: ActionInput, servicesThisLactation: number, daysOpen: number | null) => ({
    ...cow,
    cycle: {
      lastCalvingDate: daysOpen === null ? null : iso(shift(daysOpen)),
      daysInMilk: daysOpen,
      daysOpen,
      servicesThisLactation,
    },
  });

  it('flags a repeat breeder at the configured count', () => {
    const empty = served(40, { pd_done: true, pd_result: 'negative' });
    expect(cowBadges(withCycle(empty, S.repeatBreederServices, 100), S, today))
      .toContain('repeat_breeder');
    expect(cowBadges(withCycle(empty, S.repeatBreederServices - 1, 100), S, today))
      .not.toContain('repeat_breeder');
  });

  it('flags a cow who has been open too long', () => {
    const empty = served(40, { pd_done: true, pd_result: 'negative' });
    expect(cowBadges(withCycle(empty, 1, S.longOpenDays + 1), S, today)).toContain('long_open');
    expect(cowBadges(withCycle(empty, 1, S.longOpenDays), S, today)).not.toContain('long_open');
  });

  it('says nothing about a cow who is carrying', () => {
    // The clock stopped at conception; counting her services or her open days
    // from here is the classic way to make both numbers useless.
    const carrying = pregnant(100);
    const badges = cowBadges(withCycle(carrying, 5, 300), S, today);
    expect(badges).not.toContain('repeat_breeder');
    expect(badges).not.toContain('long_open');
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
    expect(hasImpossibleGestation(calved('2026-03-25', '2026-07-11').record)).toBe(true);
  });

  it('flags one that arrived impossibly late', () => {
    expect(hasImpossibleGestation(calved('2025-04-25', '2026-08-10').record)).toBe(true);
    expect(hasImpossibleGestation(calved('2025-05-20', '2026-04-06').record)).toBe(true);
  });

  it('allows the full natural spread without complaining', () => {
    // The herd's real range is 272-296 days.
    for (const days of [272, 285, 296]) {
      const ai = new Date(2025, 0, 1);
      const del = new Date(ai);
      del.setDate(del.getDate() + days);
      expect(hasImpossibleGestation(calved(iso(ai), iso(del)).record)).toBe(false);
    }
  });

  it('keeps them off the headings and in their own list', () => {
    const odd = calved('2025-04-25', '2026-08-10');
    const grouped = groupHerd([odd], S, today);
    expect(grouped.oddRecords).toHaveLength(1);
    // Still placed: she is a real cow with a real stage, just a suspect record.
    expect(grouped.placed).toBe(1);
  });

  it('draws the line outside normal variation', () => {
    expect(PLAUSIBLE_GESTATION_MIN).toBeLessThan(272);
  });
});

describe('settings', () => {
  it('fills in the new numbers when a stored setting predates them', () => {
    const old = normaliseBreedingSettings({ gestationDays: 280 });
    expect(old.repeatBreederServices).toBe(S.repeatBreederServices);
    expect(old.longOpenDays).toBe(S.longOpenDays);
    expect(old.serviceDueAfterCalvingDays).toBe(S.serviceDueAfterCalvingDays);
    expect(old.gestationDays).toBe(280);
  });
});

describe('reading the lactation across every record', () => {
  it('finds the calving even after she has been served again', () => {
    // The calving is on the previous record, which is exactly why the board
    // could not show it: latestRecord() returns the new service.
    const calvedOn = iso(shift(90));
    const history = [
      { ai_date: iso(shift(30)), pd_done: false, pd_result: null, actual_delivery_date: null },
      {
        ai_date: iso(shift(90 + S.gestationDays)),
        pd_done: true,
        pd_result: 'positive' as const,
        actual_delivery_date: calvedOn,
      },
    ];
    const cycle = buildCowCycle(history, history[0], today);
    expect(cycle.lastCalvingDate).toBe(calvedOn);
    expect(cycle.daysInMilk).toBe(90);
    expect(cycle.daysOpen).toBe(90);
    expect(cycle.servicesThisLactation).toBe(1);
  });

  it('stops the open clock once she is carrying', () => {
    const calvedOn = iso(shift(200));
    const history = [
      {
        ai_date: iso(shift(120)),
        pd_done: true,
        pd_result: 'positive' as const,
        actual_delivery_date: null,
      },
      {
        ai_date: iso(shift(200 + S.gestationDays)),
        pd_done: true,
        pd_result: 'positive' as const,
        actual_delivery_date: calvedOn,
      },
    ];
    const cycle = buildCowCycle(history, history[0], today);
    expect(cycle.daysInMilk).toBe(200);
    expect(cycle.daysOpen).toBeNull();
  });

  it('counts a heifer\'s services when she has never calved', () => {
    const history = [
      { ai_date: iso(shift(20)), pd_done: false, pd_result: null, actual_delivery_date: null },
      { ai_date: iso(shift(50)), pd_done: true, pd_result: 'negative' as const, actual_delivery_date: null },
    ];
    const cycle = buildCowCycle(history, history[0], today);
    expect(cycle.lastCalvingDate).toBeNull();
    expect(cycle.servicesThisLactation).toBe(2);
    expect(cycle.daysOpen).toBeNull();
  });
});
