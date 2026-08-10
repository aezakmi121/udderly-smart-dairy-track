/**
 * How breeding dates are worded on screen.
 *
 * The board is read one-handed on a phone in the shed, so the useful thing is
 * "calving in 6 days", not a date the reader has to subtract from today. The
 * date stays alongside for when it is actually needed.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-08-05` becomes `05/08/2026`, matching the rest of the app. */
export const formatDMY = (value?: string | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}`;
};

/** Parsed field by field: a plain date column has no timezone of its own. */
export const parseDay = (value?: string | null): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Whole days from `value` to `today`. Positive means in the past. */
export const daysSince = (value?: string | null, today: Date = new Date()): number | null => {
  const d = parseDay(value);
  if (!d) return null;
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((midnight.getTime() - d.getTime()) / 86400000);
};

/** Whole days from `today` to `value`. Positive means still to come. */
export const daysUntil = (value?: string | null, today: Date = new Date()): number | null => {
  const since = daysSince(value, today);
  return since === null ? null : -since;
};

/**
 * "today", "tomorrow", "in 6 days", "3 days late".
 *
 * A calving that has passed its date is *late*, not "-3 days" -- the word is
 * what tells a tired reader something is wrong.
 */
export const untilPhrase = (days: number | null): string => {
  if (days === null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return '1 day late';
  return `${Math.abs(days)} days late`;
};

/** "today", "yesterday", "38 days ago". */
export const sincePhrase = (days: number | null): string => {
  if (days === null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 0) return untilPhrase(-days);
  return `${days} days ago`;
};
