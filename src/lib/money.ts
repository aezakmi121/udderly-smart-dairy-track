// Money utilities — INR amounts with paise precision.
// All monetary values are stored and computed in rupees as JavaScript numbers,
// rounded to paise (2 decimals) at boundaries to avoid floating-point drift.

/** Round a numeric rupee value to paise (2 decimal places). */
export const roundToPaise = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/** Format a rupee amount for display in en-IN locale with 2 decimal places.
 *  12345.6 → "₹12,345.60" */
export const formatINR = (n: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundToPaise(n));
};

/** Format a rupee amount with no decimals (for compact summary tiles / bank registers).
 *  12345.6 → "₹12,346" */
export const formatINRWhole = (n: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
};

/** Parse a free-text rupee input (e.g. "₹1,234.56" or "1234.5") to a number,
 *  rounded to paise. Returns 0 on invalid input. */
export const parseAmount = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return roundToPaise(parsed);
};
