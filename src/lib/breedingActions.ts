import { cycleState, type CycleRecord } from './aiCycle';
import {
  type BreedingSettings,
  PLAUSIBLE_GESTATION_MIN,
  PLAUSIBLE_GESTATION_MAX,
} from './breedingSettings';

/**
 * What, if anything, a cow needs from you today.
 *
 * The board exists to answer three questions asked every morning -- who needs a
 * PD, who is about to calve, and who must move from the dry group to milking --
 * so those are the groups, rather than a flat list sorted by a rule you have to
 * remember.
 */
export type ActionGroup =
  | 'heat_watch'
  | 'pd_due'
  | 'pd_overdue'
  | 'due_to_calve'
  | 'move_to_milking'
  | 'overdue_delivery'
  | 'check_record';

export interface ActionInput {
  record: CycleRecord & { expected_delivery_date?: string | null };
  movedToMilking?: boolean;
}

const dayDiff = (from: string | null | undefined, to: Date): number | null => {
  if (!from) return null;
  const d = new Date(`${String(from).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const midnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((midnight.getTime() - d.getTime()) / 86400000);
};

/**
 * Every group this cow belongs in. A cow can legitimately be in more than one
 * -- due to calve and needing to move are different jobs on the same animal --
 * so this returns all of them rather than picking a winner.
 */
export const cowActions = (
  input: ActionInput,
  settings: BreedingSettings,
  today: Date = new Date()
): ActionGroup[] => {
  const { record } = input;
  const state = cycleState(record);
  const groups: ActionGroup[] = [];
  if (!state) return groups;

  const sinceService = dayDiff(record.ai_date, today);
  const untilCalving =
    record.expected_delivery_date === null || record.expected_delivery_date === undefined
      ? null
      : -(dayDiff(record.expected_delivery_date, today) ?? 0);

  if (state === 'delivered') {
    // A calving this far from its service was not that service's calf.
    const gestation =
      record.actual_delivery_date && record.ai_date
        ? (dayDiff(record.ai_date, new Date(`${record.actual_delivery_date}T00:00:00`)) ?? 0)
        : null;
    if (
      gestation !== null &&
      (gestation < PLAUSIBLE_GESTATION_MIN || gestation > PLAUSIBLE_GESTATION_MAX)
    ) {
      groups.push('check_record');
    }
    return groups;
  }

  if (state === 'awaiting_pd' && sinceService !== null) {
    if (sinceService >= settings.heatWatchFromDays && sinceService <= settings.heatWatchToDays) {
      groups.push('heat_watch');
    }
    if (sinceService > settings.pdOverdueAfterDays) {
      groups.push('pd_overdue');
    } else if (sinceService >= settings.pdDueFromDays) {
      groups.push('pd_due');
    }
  }

  if (state === 'pregnant' && untilCalving !== null) {
    if (untilCalving < 0) {
      // Expected date passed with no calving recorded. Either she calved and
      // nobody wrote it down, or something went wrong.
      groups.push('overdue_delivery');
    } else {
      if (untilCalving <= settings.dueToCalveWithinDays) groups.push('due_to_calve');
      if (untilCalving <= settings.dryToMilkingDaysBefore && !input.movedToMilking) {
        groups.push('move_to_milking');
      }
    }
  }

  return groups;
};

/** Order the board renders them in: soonest-to-act first. */
export const ACTION_ORDER: ActionGroup[] = [
  'overdue_delivery',
  'due_to_calve',
  'move_to_milking',
  'pd_overdue',
  'pd_due',
  'heat_watch',
  'check_record',
];

export const ACTION_LABEL: Record<ActionGroup, string> = {
  overdue_delivery: 'Overdue to calve',
  due_to_calve: 'Due to calve',
  move_to_milking: 'Move to milking',
  pd_overdue: 'PD overdue',
  pd_due: 'PD due',
  heat_watch: 'Watch for heat',
  check_record: 'Check the record',
};

export const ACTION_HELP: Record<ActionGroup, string> = {
  overdue_delivery: 'Expected date has passed with no calving recorded.',
  due_to_calve: 'Calving expected shortly.',
  move_to_milking: 'Move her from the dry group so she is ready to calve.',
  pd_overdue: 'Served a long time ago and still unchecked — every week costs a cycle.',
  pd_due: 'Old enough for a reliable pregnancy check.',
  heat_watch: 'If the service failed she should return to heat about now.',
  check_record: 'The gap between service and calving is impossible — the calving is on the wrong record, or a date is wrong.',
};

/** Bucket a herd into the groups, keeping each cow in every group she belongs to. */
export const groupHerd = <T extends ActionInput>(
  cows: T[],
  settings: BreedingSettings,
  today: Date = new Date()
): Map<ActionGroup, T[]> => {
  const out = new Map<ActionGroup, T[]>();
  for (const cow of cows) {
    for (const group of cowActions(cow, settings, today)) {
      const list = out.get(group) ?? [];
      list.push(cow);
      out.set(group, list);
    }
  }
  return out;
};
