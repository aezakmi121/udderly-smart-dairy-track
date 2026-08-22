import { cycleState, type CycleRecord } from './aiCycle';
import { EMPTY_COW_CYCLE, type CowCycle } from './cowCycle';
import {
  type BreedingSettings,
  PLAUSIBLE_GESTATION_MIN,
  PLAUSIBLE_GESTATION_MAX,
} from './breedingSettings';

/**
 * Where a cow stands, and what she needs.
 *
 * These are a **partition of the herd**, not a list of alerts: every active cow
 * lands in exactly one, so the heading counts add up to the herd size and a cow
 * who has fallen through is visible as a number that does not reconcile. The
 * board previously listed a cow only if she tripped one of seven conditions,
 * which left a cow served last week, a cow four months pregnant, and a cow that
 * calved on Tuesday in no heading at all -- indistinguishable from a cow who
 * had been quietly lost.
 *
 * Jobs that can apply to a cow *while* she is somewhere in the cycle -- needing
 * to be walked to the milking shed, being a repeat breeder -- are badges
 * instead. See `cowBadges`.
 */
export type ActionGroup =
  | 'overdue_delivery'
  | 'due_to_calve'
  | 'move_to_milking'
  | 'pd_overdue'
  | 'pd_due'
  | 'not_pregnant'
  | 'ready_to_serve'
  | 'heat_watch'
  | 'recently_calved'
  | 'pregnant_on_track'
  | 'served_waiting';

export type CowBadge = 'repeat_breeder' | 'long_open' | 'needs_move';

export interface ActionInput {
  record: CycleRecord & { expected_delivery_date?: string | null };
  movedToMilking?: boolean;
  /** Read across her whole history; defaults to empty for a lone record. */
  cycle?: CowCycle;
}

const dayDiff = (from: string | null | undefined, to: Date): number | null => {
  if (!from) return null;
  const d = new Date(`${String(from).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const midnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((midnight.getTime() - d.getTime()) / 86400000);
};

/**
 * The one heading she belongs under, decided by first match down this list.
 *
 * Ordering is the whole mechanism: a cow ten days from calving who has not been
 * moved is *both* due to calve and needing a move, and listing her twice under
 * two headings is what made the old board hard to read. She appears under the
 * more urgent one and carries a `needs_move` badge.
 */
export const cowStage = (
  input: ActionInput,
  settings: BreedingSettings,
  today: Date = new Date()
): ActionGroup | null => {
  const { record } = input;
  const state = cycleState(record);
  if (!state) return null;

  const cycle = input.cycle ?? EMPTY_COW_CYCLE;
  const sinceService = dayDiff(record.ai_date, today);
  const untilCalving =
    record.expected_delivery_date === null || record.expected_delivery_date === undefined
      ? null
      : -(dayDiff(record.expected_delivery_date, today) ?? 0);

  if (state === 'pregnant') {
    if (untilCalving === null) return 'pregnant_on_track';
    // Expected date passed with no calving recorded. Either she calved and
    // nobody wrote it down, or something went wrong.
    if (untilCalving < 0) return 'overdue_delivery';
    if (untilCalving <= settings.dueToCalveWithinDays) return 'due_to_calve';
    if (untilCalving <= settings.dryToMilkingDaysBefore && !input.movedToMilking) {
      return 'move_to_milking';
    }
    return 'pregnant_on_track';
  }

  if (state === 'awaiting_pd') {
    if (sinceService === null) return 'served_waiting';
    if (sinceService > settings.pdOverdueAfterDays) return 'pd_overdue';
    if (sinceService >= settings.pdDueFromDays) return 'pd_due';
    if (sinceService >= settings.heatWatchFromDays && sinceService <= settings.heatWatchToDays) {
      return 'heat_watch';
    }
    // Served, but too early for a heat watch or too late for one and not yet
    // old enough to check. Nothing to do but wait.
    return 'served_waiting';
  }

  // PD came back negative or inconclusive, or the service did not take. She is
  // empty and can be served now.
  if (state === 'open' || state === 'failed') return 'not_pregnant';

  if (state === 'delivered') {
    const sinceCalving = cycle.daysInMilk ?? dayDiff(record.actual_delivery_date, today);
    if (sinceCalving !== null && sinceCalving < settings.serviceDueAfterCalvingDays) {
      return 'recently_calved';
    }
    // Past her waiting period with nothing booked. She had no heading at all
    // before this: her last record is closed, so no group claimed her, and an
    // empty cow quietly costs a lactation.
    return 'ready_to_serve';
  }

  return null;
};

/**
 * Things true of a cow regardless of which heading she is under.
 *
 * A repeat breeder is still, right now, either awaiting a check or empty --
 * you act on the stage, and the badge tells you to act differently.
 */
export const cowBadges = (
  input: ActionInput,
  settings: BreedingSettings,
  today: Date = new Date()
): CowBadge[] => {
  const { record } = input;
  const state = cycleState(record);
  if (!state) return [];

  const cycle = input.cycle ?? EMPTY_COW_CYCLE;
  const badges: CowBadge[] = [];
  const carrying = state === 'pregnant';

  if (!carrying && cycle.servicesThisLactation >= settings.repeatBreederServices) {
    badges.push('repeat_breeder');
  }
  if (!carrying && cycle.daysOpen !== null && cycle.daysOpen > settings.longOpenDays) {
    badges.push('long_open');
  }
  if (carrying && !input.movedToMilking) {
    const untilCalving =
      record.expected_delivery_date === null || record.expected_delivery_date === undefined
        ? null
        : -(dayDiff(record.expected_delivery_date, today) ?? 0);
    if (untilCalving !== null && untilCalving >= 0 && untilCalving <= settings.dryToMilkingDaysBefore) {
      badges.push('needs_move');
    }
  }

  return badges;
};

/**
 * A calving this far from its service was not that service's calf.
 *
 * Not a stage and not a badge -- a mis-entered record, which the board shows
 * once at the foot rather than in the morning's work.
 */
export const hasImpossibleGestation = (record: ActionInput['record']): boolean => {
  if (!record.actual_delivery_date || !record.ai_date) return false;
  const gestation = dayDiff(record.ai_date, new Date(`${record.actual_delivery_date}T00:00:00`));
  if (gestation === null) return false;
  return gestation < PLAUSIBLE_GESTATION_MIN || gestation > PLAUSIBLE_GESTATION_MAX;
};

/** Headings that mean work today, in the order the board renders them. */
export const ACTION_ORDER: ActionGroup[] = [
  'overdue_delivery',
  'due_to_calve',
  'move_to_milking',
  'pd_overdue',
  'pd_due',
  'not_pregnant',
  'ready_to_serve',
  'heat_watch',
];

/**
 * Headings that are position, not work. Folded away behind one line: you read
 * these weekly, and they should not cost the same screen space as PD overdue.
 */
export const INFO_ORDER: ActionGroup[] = [
  'recently_calved',
  'pregnant_on_track',
  'served_waiting',
];

/** Every stage, which is what must add up to the herd. */
export const ALL_STAGES: ActionGroup[] = [...ACTION_ORDER, ...INFO_ORDER];

export const ACTION_LABEL: Record<ActionGroup, string> = {
  overdue_delivery: 'Overdue to calve',
  due_to_calve: 'Due to calve',
  move_to_milking: 'Move to milking',
  pd_overdue: 'PD overdue',
  pd_due: 'PD due',
  not_pregnant: 'Not pregnant — reserve',
  ready_to_serve: 'Ready to serve',
  heat_watch: 'Watch for heat',
  recently_calved: 'Recently calved',
  pregnant_on_track: 'Pregnant — on track',
  served_waiting: 'Served — waiting',
};

export const ACTION_HELP: Record<ActionGroup, string> = {
  overdue_delivery: 'Expected date has passed with no calving recorded.',
  due_to_calve: 'Calving expected shortly.',
  move_to_milking: 'Move her from the dry group so she is ready to calve.',
  pd_overdue: 'Served a long time ago and still unchecked — every week costs a cycle.',
  pd_due: 'Old enough for a reliable pregnancy check.',
  not_pregnant: 'The check came back empty. She can be served again now.',
  ready_to_serve: 'Past her waiting period since calving, and nothing is booked.',
  heat_watch: 'If the service failed she should return to heat about now.',
  recently_calved: 'Still inside her waiting period. Nothing to do yet.',
  pregnant_on_track: 'Confirmed carrying, with a while to go.',
  served_waiting: 'Served, and too early to check or watch. Nothing to do.',
};

export const BADGE_LABEL: Record<CowBadge, string> = {
  repeat_breeder: 'Repeat breeder',
  long_open: 'Long open',
  needs_move: 'Needs moving',
};

export const BADGE_HELP: Record<CowBadge, string> = {
  repeat_breeder: 'Served this many times without conceiving — worth a vet rather than another straw.',
  long_open: 'Well past the calving interval this herd is aiming for.',
  needs_move: 'Close enough to calving to belong in the milking group.',
};

export interface GroupedHerd<T> {
  /** One entry per cow, under exactly one stage. */
  stages: Map<ActionGroup, T[]>;
  /** Mis-entered records, which are not a stage. */
  oddRecords: T[];
  /** Cows placed in a stage — should equal the active herd. */
  placed: number;
  /** Cows with nothing on file to decide from. */
  unplaced: number;
}

/** Bucket a herd into stages, one cow to one stage. */
export const groupHerd = <T extends ActionInput>(
  cows: T[],
  settings: BreedingSettings,
  today: Date = new Date()
): GroupedHerd<T> => {
  const stages = new Map<ActionGroup, T[]>();
  const oddRecords: T[] = [];
  let placed = 0;
  let unplaced = 0;

  for (const cow of cows) {
    const stage = cowStage(cow, settings, today);
    if (stage) {
      const list = stages.get(stage) ?? [];
      list.push(cow);
      stages.set(stage, list);
      placed += 1;
    } else {
      unplaced += 1;
    }
    if (hasImpossibleGestation(cow.record)) oddRecords.push(cow);
  }

  return { stages, oddRecords, placed, unplaced };
};
