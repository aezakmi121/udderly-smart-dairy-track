import { describe, it, expect } from 'vitest';
// Imported straight from the edge function's shared module rather than copied,
// so the rules the UI shows and the rules the server enforces cannot drift.
import {
  pinProblem,
  isValidPin,
  newSalt,
  hashPin,
  verifyPin,
  constantTimeEqual,
  normalisePhone,
  lockoutUntil,
  PIN_LENGTH,
  MAX_ATTEMPTS,
  LOCKOUT_MINUTES,
} from '../../supabase/functions/_shared/farmerPin';

// Hashing is deliberately slow, so tests use a low count. Correctness of the
// derivation does not depend on the number of rounds.
const FAST = 1000;

describe('choosing a PIN', () => {
  it('accepts an ordinary four digit PIN', () => {
    expect(pinProblem('4907')).toBeNull();
    expect(isValidPin('8264')).toBe(true);
  });

  it('insists on exactly four digits', () => {
    expect(pinProblem('123')).toBe('length');
    expect(pinProblem('12345')).toBe('length');
    expect(pinProblem('')).toBe('length');
  });

  it('refuses anything that is not a digit', () => {
    expect(pinProblem('12a4')).toBe('digits');
    expect(pinProblem('१२३४')).toBe('digits');
    expect(pinProblem(' 123')).toBe('digits');
  });

  // Five attempts is plenty to try the handful of PINs people actually pick.
  it('refuses the PINs everyone picks', () => {
    expect(pinProblem('1212')).toBe('common');
    expect(pinProblem('6969')).toBe('common');
    expect(pinProblem('2580')).toBe('common');
  });

  it('refuses four of the same digit', () => {
    for (const p of ['0000', '1111', '5555', '9999']) {
      expect(pinProblem(p)).toBe('repeated');
    }
  });

  // Each rule has to be reachable, or the reason shown to the farmer is
  // whichever check happened to run first rather than the real one.
  it('gives the reason that actually applies', () => {
    expect(pinProblem('1234')).toBe('sequence');
    expect(pinProblem('0000')).toBe('repeated');
    expect(pinProblem('1010')).toBe('common');
  });

  it('refuses a straight run up or down', () => {
    expect(pinProblem('3456')).toBe('sequence');
    expect(pinProblem('9876')).toBe('sequence');
    expect(pinProblem('6543')).toBe('sequence');
  });

  it('allows a near-run that is not actually one', () => {
    expect(pinProblem('1235')).toBeNull();
    expect(pinProblem('2468')).toBeNull();
  });

  it('rejects a non-string rather than throwing', () => {
    expect(pinProblem(null as never)).toBe('length');
    expect(pinProblem(1234 as never)).toBe('length');
  });

  it('agrees with itself', () => {
    expect(isValidPin('1234')).toBe(false);
    expect(PIN_LENGTH).toBe(4);
  });
});

describe('hashing a PIN', () => {
  it('verifies the PIN it was made from', async () => {
    const salt = newSalt();
    const hash = await hashPin('4907', salt, FAST);
    expect(await verifyPin('4907', salt, hash, FAST)).toBe(true);
  });

  it('rejects every other PIN', async () => {
    const salt = newSalt();
    const hash = await hashPin('4907', salt, FAST);
    for (const wrong of ['4908', '9074', '0000', '49070']) {
      expect(await verifyPin(wrong, salt, hash, FAST)).toBe(false);
    }
  });

  // Without a per-farmer salt, two farmers with the same PIN share a hash, and
  // one leaked hash would give away every account that chose that PIN.
  it('gives the same PIN a different hash for each farmer', async () => {
    const a = await hashPin('4907', newSalt(), FAST);
    const b = await hashPin('4907', newSalt(), FAST);
    expect(a).not.toBe(b);
  });

  it('does not verify against a different salt', async () => {
    const hash = await hashPin('4907', newSalt(), FAST);
    expect(await verifyPin('4907', newSalt(), hash, FAST)).toBe(false);
  });

  // The count is stored per row so it can be raised later; verifying with the
  // wrong one has to fail rather than quietly succeed.
  it('is tied to the iteration count it was made with', async () => {
    const salt = newSalt();
    const hash = await hashPin('4907', salt, FAST);
    expect(await verifyPin('4907', salt, hash, FAST * 2)).toBe(false);
  });

  it('never stores the PIN itself', async () => {
    const salt = newSalt();
    const hash = await hashPin('4907', salt, FAST);
    expect(hash).not.toContain('4907');
    expect(salt).not.toContain('4907');
  });

  it('produces a fresh salt every time', () => {
    const salts = new Set(Array.from({ length: 50 }, () => newSalt()));
    expect(salts.size).toBe(50);
  });
});

describe('comparing hashes', () => {
  it('matches identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });

  it('rejects a difference wherever it falls', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'zbc')).toBe(false);
  });

  it('rejects different lengths', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', 'a')).toBe(false);
  });
});

describe('phone numbers', () => {
  it('keeps the last ten digits, however the number was typed', () => {
    expect(normalisePhone('9876543210')).toBe('9876543210');
    expect(normalisePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalisePhone('091-9876543210')).toBe('9876543210');
  });

  it('gives nothing back for a number too short to be one', () => {
    expect(normalisePhone('98765')).toBe('');
    expect(normalisePhone('')).toBe('');
    expect(normalisePhone(null)).toBe('');
    expect(normalisePhone(undefined)).toBe('');
  });
});

describe('lockout', () => {
  it('locks for the stated time', () => {
    const now = new Date('2026-08-06T10:00:00Z');
    expect(lockoutUntil(now)).toBe('2026-08-06T10:15:00.000Z');
    expect(LOCKOUT_MINUTES).toBe(15);
  });

  // Ten thousand PINs, five tries per quarter hour: guessing your way in takes
  // over a month of solid effort, which is the actual defence here.
  it('allows few enough attempts that guessing is not worth it', () => {
    expect(MAX_ATTEMPTS).toBeLessThanOrEqual(5);
    const hoursToTryAll = (10_000 / MAX_ATTEMPTS) * (LOCKOUT_MINUTES / 60);
    expect(hoursToTryAll).toBeGreaterThan(24 * 20);
  });
});
