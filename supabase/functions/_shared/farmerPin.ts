/**
 * PIN rules and hashing for the farmer portal.
 *
 * Deliberately free of Deno-only imports: it runs unchanged in the edge
 * functions and under vitest, so the rules the UI checks and the rules the
 * server enforces cannot drift apart.
 */

export const PIN_LENGTH = 4;
export const DEFAULT_ITERATIONS = 150_000;

/** Wrong guesses allowed before the account locks. */
export const MAX_ATTEMPTS = 5;
/** How long a locked account stays locked. */
export const LOCKOUT_MINUTES = 15;

/**
 * PINs nobody should be allowed to choose.
 *
 * Four digits is ten thousand combinations, but people do not pick evenly: a
 * handful of patterns cover a large share of real choices, and those are the
 * ones an opportunist tries first -- well within the five attempts allowed.
 */
// Only patterns the rules below do not already catch -- runs and repeated
// digits are handled there, so listing them here as well would leave those
// rules unreachable and make the reason given to the farmer arbitrary.
const BANNED = new Set([
  '1212', '2121', '1122', '2211', '6969', '1010', '0101', '1313',
  '2580', '0852', '1004', '2000', '2001', '1947',
]);

export type PinProblem = 'length' | 'digits' | 'common' | 'sequence' | 'repeated';

/** What is wrong with this PIN, or null if nothing is. */
export const pinProblem = (pin: string): PinProblem | null => {
  if (typeof pin !== 'string' || pin.length !== PIN_LENGTH) return 'length';
  if (!/^\d{4}$/.test(pin)) return 'digits';
  if (BANNED.has(pin)) return 'common';

  const digits = [...pin].map(Number);
  if (digits.every((d) => d === digits[0])) return 'repeated';

  const step = digits[1] - digits[0];
  if ((step === 1 || step === -1) && digits.every((d, i) => i === 0 || d - digits[i - 1] === step)) {
    return 'sequence';
  }
  return null;
};

export const isValidPin = (pin: string): boolean => pinProblem(pin) === null;

const toBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

const fromBase64 = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const newSalt = (): string => toBase64(crypto.getRandomValues(new Uint8Array(16)));

/** PBKDF2-SHA256. The iteration count travels with the row so it can be raised. */
export const hashPin = async (
  pin: string,
  salt: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations, hash: 'SHA-256' },
    key,
    256
  );
  return toBase64(new Uint8Array(bits));
};

/** Compare without leaking, through timing, how much of the hash matched. */
export const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const verifyPin = async (
  pin: string,
  salt: string,
  expectedHash: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<boolean> => constantTimeEqual(await hashPin(pin, salt, iterations), expectedHash);

/** Last ten digits, which is how Indian numbers are stored and typed here. */
export const normalisePhone = (raw: unknown): string => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};

export const lockoutUntil = (now: Date = new Date()): string =>
  new Date(now.getTime() + LOCKOUT_MINUTES * 60_000).toISOString();
