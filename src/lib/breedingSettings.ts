/**
 * The numbers the breeding screens run on.
 *
 * These were previously scattered as hardcoded constants that disagreed with
 * each other: gestation was 285 in the record-creation path and 283 in the
 * alerts, and the PD window was fixed at 45-60 in pdUtils while a
 * `pd_alert_days` setting existed that nothing consulted. One shape, read from
 * one settings key, so a farm changing a number changes it everywhere.
 */

export interface BreedingSettings {
  /** Service to calving. 285 is this herd's own median across 16 calvings. */
  gestationDays: number;
  /**
   * A cow that did not conceive returns to heat around day 21. Watching for it
   * costs nothing and catches a failed service a fortnight before any PD would.
   */
  heatWatchFromDays: number;
  heatWatchToDays: number;
  /** Earliest a rectal palpation is reliable. */
  pdDueFromDays: number;
  /** Past this, an unchecked cow is burning oestrous cycles. */
  pdOverdueAfterDays: number;
  /** How far ahead to start listing a cow as due to calve. */
  dueToCalveWithinDays: number;
  /** Move her from the dry group to milking this many days before calving. */
  dryToMilkingDaysBefore: number;
  /**
   * The voluntary waiting period. Past this many days since calving with
   * nothing booked, she belongs on the board as needing a service.
   *
   * The same number separates "recently calved" from "ready to serve", which
   * is what keeps those two a clean split rather than a gap or an overlap.
   */
  serviceDueAfterCalvingDays: number;
  /**
   * Services in one lactation without conceiving before she is worth a second
   * look. Three is the standard definition: at four you have already burned an
   * extra oestrous cycle before anyone asks why.
   */
  repeatBreederServices: number;
  /**
   * Days open past which she is behind on the calving interval. A 13-month
   * interval is about 90 days open, so 120 is a month past target and still
   * recoverable -- by 150 it is not.
   */
  longOpenDays: number;
}

export const BREEDING_SETTINGS_KEY = 'breeding_settings';

export const DEFAULT_BREEDING_SETTINGS: BreedingSettings = {
  gestationDays: 285,
  heatWatchFromDays: 18,
  heatWatchToDays: 24,
  pdDueFromDays: 35,
  pdOverdueAfterDays: 60,
  // Left at 21, not widened to 30: the move to milking happens 30 days out, so
  // a 30-day calving window would make the two headings the same list of cows
  // under different names -- which is what splitting them was for.
  dueToCalveWithinDays: 21,
  dryToMilkingDaysBefore: 30,
  serviceDueAfterCalvingDays: 60,
  repeatBreederServices: 3,
  longOpenDays: 120,
};

const int = (value: unknown, fallback: number): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Fill in anything a stored setting is missing, and refuse to return a window
 * that runs backwards -- a PD "due" day after the "overdue" day would leave
 * cows in neither list.
 */
export const normaliseBreedingSettings = (raw: unknown): BreedingSettings => {
  const t = (raw ?? {}) as Partial<BreedingSettings>;
  const d = DEFAULT_BREEDING_SETTINGS;

  const heatFrom = int(t.heatWatchFromDays, d.heatWatchFromDays);
  const heatTo = Math.max(heatFrom, int(t.heatWatchToDays, d.heatWatchToDays));
  const pdFrom = int(t.pdDueFromDays, d.pdDueFromDays);
  const pdOverdue = Math.max(pdFrom, int(t.pdOverdueAfterDays, d.pdOverdueAfterDays));

  return {
    gestationDays: int(t.gestationDays, d.gestationDays),
    heatWatchFromDays: heatFrom,
    heatWatchToDays: heatTo,
    pdDueFromDays: pdFrom,
    pdOverdueAfterDays: pdOverdue,
    dueToCalveWithinDays: int(t.dueToCalveWithinDays, d.dueToCalveWithinDays),
    dryToMilkingDaysBefore: int(t.dryToMilkingDaysBefore, d.dryToMilkingDaysBefore),
    serviceDueAfterCalvingDays: int(t.serviceDueAfterCalvingDays, d.serviceDueAfterCalvingDays),
    repeatBreederServices: int(t.repeatBreederServices, d.repeatBreederServices),
    longOpenDays: int(t.longOpenDays, d.longOpenDays),
  };
};

/**
 * Gestations outside this band are not calvings, they are mis-entered records:
 * a calving attached to the wrong service, or a date typed wrong. Three of the
 * nineteen recorded calvings sit outside it -- 108, 321 and 472 days.
 *
 * Wider than the herd's real spread (272-296) so normal variation is never
 * flagged.
 */
export const PLAUSIBLE_GESTATION_MIN = 260;
export const PLAUSIBLE_GESTATION_MAX = 305;
