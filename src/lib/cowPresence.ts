/**
 * Is this cow still on the farm?
 *
 * One rule, in one place, because there used to be five. Every hook in
 * useCows.ts listed its own subset of statuses -- `['active','dry','sick']` for
 * vaccination, `['active','pregnant','sick']` for milking, `['active']` alone
 * for choosing a calf's mother -- describing intentions that had never once
 * taken effect, because no cow has ever been anything but `active` or `sold`.
 * The day someone set `dry`, a cow would have vanished from three screens and
 * stayed on two, silently and differently.
 *
 * A cow is on the farm unless she has left it. That is the whole rule, and
 * stating it as an exclusion rather than an inclusion list matters: a status
 * added later defaults to being visible rather than to disappearing from
 * screens nobody thought to check.
 */

/** The statuses that mean she is gone. Everything else means she is here. */
export const GONE_STATUSES = ['sold', 'dead'] as const;
export type GoneStatus = (typeof GONE_STATUSES)[number];

/**
 * What the app offers today. `dry`, `pregnant` and `sick` remain in the
 * database enum -- Postgres cannot drop a value -- but nothing writes them any
 * more: a cow here is active whatever her condition, and pregnancy is decided
 * by ai_records, which actually knows.
 */
export const COW_STATUSES = ['active', 'sold', 'dead'] as const;
export type CowStatus = (typeof COW_STATUSES)[number];

export const COW_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  sold: 'Sold',
  dead: 'Dead',
  // Legacy values, still readable if any row ever carried one.
  dry: 'Dry',
  pregnant: 'Pregnant',
  sick: 'Sick',
};

export const isGone = (status: string | null | undefined): boolean =>
  GONE_STATUSES.includes((status ?? '') as GoneStatus);

export const isOnFarm = (status: string | null | undefined): boolean => !isGone(status);

/** PostgREST list form, for `.not('status', 'in', ...)`. */
export const GONE_STATUS_FILTER = `(${GONE_STATUSES.join(',')})`;

export const COW_EXIT_REASONS = [
  'sold',
  'died_illness',
  'died_calving',
  'died_accident',
  'culled_infertility',
  'culled_yield',
  'other',
] as const;
export type CowExitReason = (typeof COW_EXIT_REASONS)[number];

/** Kept countable rather than free text so a year of losses can be totted up. */
export const COW_EXIT_REASON_LABEL: Record<CowExitReason, string> = {
  sold: 'Sold',
  died_illness: 'Died — illness',
  died_calving: 'Died — calving',
  died_accident: 'Died — accident',
  culled_infertility: 'Culled — not conceiving',
  culled_yield: 'Culled — low yield',
  other: 'Other',
};

/** The reasons worth offering for each terminal status. */
export const exitReasonsFor = (status: string): readonly CowExitReason[] =>
  status === 'sold'
    ? (['sold', 'culled_infertility', 'culled_yield', 'other'] as const)
    : (['died_illness', 'died_calving', 'died_accident', 'other'] as const);

export const statusTone = (status: string | null | undefined): string => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'sold': return 'bg-slate-200 text-slate-700';
    case 'dead': return 'bg-zinc-800 text-zinc-100';
    // Legacy.
    case 'pregnant': return 'bg-blue-100 text-blue-800';
    case 'dry': return 'bg-yellow-100 text-yellow-800';
    case 'sick': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
