import { describe, it, expect } from 'vitest';
import { formatDMY, parseDay, daysSince, daysUntil, untilPhrase, sincePhrase } from './breedingDisplay';

describe('dates on the board', () => {
  it('reads day first, matching the rest of the app', () => {
    expect(formatDMY('2026-08-05')).toBe('05/08/2026');
  });

  it('shows a dash rather than "Invalid Date"', () => {
    expect(formatDMY(null)).toBe('—');
    expect(formatDMY('rubbish')).toBe('—');
  });

  // A plain date column has no timezone; parsing it through UTC would move
  // every calving a day for a reader west of London.
  it('is not shifted by the reader timezone', () => {
    const d = parseDay('2026-08-05')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 7, 5]);
  });
});

describe('counting days', () => {
  const today = new Date(2026, 7, 10);

  it('counts backwards to a service', () => {
    expect(daysSince('2026-07-03', today)).toBe(38);
    expect(daysSince('2026-08-10', today)).toBe(0);
  });

  it('counts forwards to a calving', () => {
    expect(daysUntil('2026-08-16', today)).toBe(6);
  });

  it('goes negative once a date has passed', () => {
    expect(daysUntil('2026-08-07', today)).toBe(-3);
  });

  it('gives nothing for a missing date', () => {
    expect(daysSince(null, today)).toBeNull();
    expect(daysUntil(undefined, today)).toBeNull();
  });
});

describe('wording', () => {
  it('names today and tomorrow rather than counting them', () => {
    expect(untilPhrase(0)).toBe('today');
    expect(untilPhrase(1)).toBe('tomorrow');
  });

  it('counts the days ahead', () => {
    expect(untilPhrase(6)).toBe('in 6 days');
  });

  // "-3 days" makes a tired reader do the work. "late" is the signal.
  it('says late rather than showing a negative number', () => {
    expect(untilPhrase(-3)).toBe('3 days late');
    expect(untilPhrase(-1)).toBe('1 day late');
  });

  it('words the past naturally too', () => {
    expect(sincePhrase(0)).toBe('today');
    expect(sincePhrase(1)).toBe('yesterday');
    expect(sincePhrase(38)).toBe('38 days ago');
  });

  it('never prints a bare dash where a number belongs', () => {
    expect(untilPhrase(null)).toBe('—');
    expect(sincePhrase(null)).toBe('—');
  });
});
