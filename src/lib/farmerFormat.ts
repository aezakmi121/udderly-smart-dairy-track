/**
 * Formatting for everything a farmer reads.
 *
 * Three rules drive every function here:
 *
 *   - Dates are DD/MM/YYYY. Not "05 अग॰ 26", not the American 08/05/2026.
 *   - Digits stay Latin with Indian grouping (1,05,430). Devanagari numerals
 *     look authentic and are slower to read for the people this is for.
 *   - Money and quality figures use the same precision as the printed slip,
 *     because the farmer is holding the slip while looking at the screen.
 *     ₹548.60 on paper and ₹549 on the phone reads as being cheated.
 */

const HINDI_WEEKDAYS = [
  'रविवार',
  'सोमवार',
  'मंगलवार',
  'बुधवार',
  'गुरुवार',
  'शुक्रवार',
  'शनिवार',
];

// Hindi uses कल for both yesterday and tomorrow, and परसों for both the day
// before and the day after. That ambiguity is harmless here: a farmer only ever
// looks backwards at milk already delivered.
const RELATIVE_PAST = ['आज', 'कल', 'परसों'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const finite = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/**
 * Turn a `YYYY-MM-DD` date column into a Date in the reader's own timezone.
 *
 * `new Date('2026-08-05')` is midnight UTC, which prints as 04/08 for anyone
 * behind UTC. Collection dates are plain calendar days with no timezone of
 * their own, so they are built field by field instead.
 */
export const parseDayString = (value?: string | null): Date | null => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  // Reject 2026-02-31 rather than let it roll silently into March.
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null;
  return date;
};

/** `2026-08-05` → `05/08/2026`. */
export const formatDateDMY = (value?: string | null): string => {
  const d = parseDayString(value);
  if (!d) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** `2026-08-05` → `मंगलवार`. Semi-literate readers navigate by weekday. */
export const hindiWeekday = (value?: string | null): string => {
  const d = parseDayString(value);
  return d ? HINDI_WEEKDAYS[d.getDay()] : '';
};

/** Whole calendar days between a date column and today. Negative for future. */
export const daysBefore = (value?: string | null, today: Date = new Date()): number | null => {
  const d = parseDayString(value);
  if (!d) return null;
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((a - d.getTime()) / 86400000);
};

/** `आज` / `कल` / `परसों` for the last three days, otherwise null. */
export const relativeDayHindi = (value?: string | null, today: Date = new Date()): string | null => {
  const diff = daysBefore(value, today);
  if (diff === null || diff < 0 || diff >= RELATIVE_PAST.length) return null;
  return RELATIVE_PAST[diff];
};

/**
 * How a day is titled on screen: a short lead the eye lands on, and the full
 * date underneath so there is never any doubt which day is being shown.
 */
export const dayHeadline = (
  value?: string | null,
  today: Date = new Date()
): { lead: string; detail: string } => {
  const dmy = formatDateDMY(value);
  const weekday = hindiWeekday(value);
  const relative = relativeDayHindi(value, today);
  if (relative) return { lead: relative, detail: [weekday, dmy].filter(Boolean).join(', ') };
  return { lead: dmy, detail: weekday };
};

const rupeesExact = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const rupeesWhole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** `₹548.60` — to the paisa, matching the slip. Use for a single delivery. */
export const formatRupees = (n: unknown): string => `₹${rupeesExact.format(finite(n))}`;

/** `₹1,05,430` — use for cycle and bill rollups, never for one delivery. */
export const formatRupeesRounded = (n: unknown): string =>
  `₹${rupeesWhole.format(Math.round(finite(n)))}`;

/** `6.50` — two decimals, the same as the slip prints. */
export const formatLitres = (n: unknown): string => finite(n).toFixed(2);

/** `12.5` — one decimal, for totals where the second digit is just noise. */
export const formatLitresShort = (n: unknown): string => finite(n).toFixed(1);

/** Fat and SNF as the slip shows them. */
export const formatPercent = (n: unknown): string => finite(n).toFixed(1);

export type SessionKey = 'morning' | 'evening';

export const SESSION_HINDI: Record<SessionKey, string> = {
  morning: 'सुबह',
  evening: 'शाम',
};

/**
 * `Cow` / `cow` / `COW` all mean the same thing. The database has held every
 * casing over time, so match without caring, and pass anything unrecognised
 * through rather than mislabelling it.
 */
export const speciesHindi = (species?: string | null): string | null => {
  const s = String(species ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'cow') return 'गाय';
  if (s === 'buffalo') return 'भैंस';
  return String(species);
};

/** `06:42 सुबह` from a collection timestamp, or null when there is none. */
export const formatClockTime = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const hours = d.getHours();
  const suffix = hours < 12 ? SESSION_HINDI.morning : SESSION_HINDI.evening;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad2(h12)}:${pad2(d.getMinutes())} ${suffix}`;
};
