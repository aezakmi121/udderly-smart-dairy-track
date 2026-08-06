import { describe, it, expect } from 'vitest';
import {
  parseDayString,
  formatDateDMY,
  hindiWeekday,
  daysBefore,
  relativeDayHindi,
  dayHeadline,
  formatRupees,
  formatRupeesRounded,
  formatLitres,
  formatLitresShort,
  formatPercent,
  speciesHindi,
  formatClockTime,
} from './farmerFormat';

describe('reading a date column', () => {
  // The bug this guards: new Date('2026-08-05') is midnight UTC, so anyone west
  // of Greenwich sees the previous day. A collection date is a calendar day,
  // not an instant.
  it('reads the day as written, whatever timezone the phone is in', () => {
    const d = parseDayString('2026-08-05')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(5);
  });

  it('ignores a time part when one is tacked on', () => {
    expect(parseDayString('2026-08-05T18:30:00Z')!.getDate()).toBe(5);
  });

  it('refuses a day that does not exist rather than rolling into next month', () => {
    expect(parseDayString('2026-02-31')).toBeNull();
  });

  it('refuses junk and blanks', () => {
    expect(parseDayString('')).toBeNull();
    expect(parseDayString(null)).toBeNull();
    expect(parseDayString('05/08/2026')).toBeNull();
  });
});

describe('date format', () => {
  it('is day first, then month, then the full year', () => {
    expect(formatDateDMY('2026-08-05')).toBe('05/08/2026');
  });

  // 08/05/2026 would be read as 8 May by an American and 8th of month 5 by
  // nobody here. Zero padding keeps the columns lining up too.
  it('pads single digits so the shape never changes', () => {
    expect(formatDateDMY('2026-01-07')).toBe('07/01/2026');
  });

  it('shows a dash when there is no date, not "Invalid Date"', () => {
    expect(formatDateDMY(null)).toBe('—');
    expect(formatDateDMY('nonsense')).toBe('—');
  });
});

describe('weekday', () => {
  it('names the day in Hindi', () => {
    expect(hindiWeekday('2026-08-05')).toBe('बुधवार');
    expect(hindiWeekday('2026-08-09')).toBe('रविवार');
  });

  it('is empty rather than wrong when the date is missing', () => {
    expect(hindiWeekday(null)).toBe('');
  });
});

describe('how long ago', () => {
  const today = new Date(2026, 7, 5);

  it('counts whole calendar days', () => {
    expect(daysBefore('2026-08-05', today)).toBe(0);
    expect(daysBefore('2026-08-04', today)).toBe(1);
    expect(daysBefore('2026-07-29', today)).toBe(7);
  });

  it('counts across a month boundary', () => {
    expect(daysBefore('2026-07-31', new Date(2026, 7, 2))).toBe(2);
  });

  // A DST change shortens or lengthens a day by an hour; rounding rather than
  // flooring keeps the count honest in places that observe it.
  it('is not thrown off by the clock changing', () => {
    expect(daysBefore('2026-03-28', new Date(2026, 2, 30))).toBe(2);
  });
});

describe('recent days by name', () => {
  const today = new Date(2026, 7, 5);

  it('names today, yesterday and the day before', () => {
    expect(relativeDayHindi('2026-08-05', today)).toBe('आज');
    expect(relativeDayHindi('2026-08-04', today)).toBe('कल');
    expect(relativeDayHindi('2026-08-03', today)).toBe('परसों');
  });

  it('falls back to the date once a name would be vague', () => {
    expect(relativeDayHindi('2026-08-02', today)).toBeNull();
  });

  // कल also means tomorrow, so a future date must never borrow the name.
  it('never names a future day', () => {
    expect(relativeDayHindi('2026-08-06', today)).toBeNull();
  });
});

describe('day headline', () => {
  const today = new Date(2026, 7, 5);

  it('leads with the name and still spells out the date', () => {
    expect(dayHeadline('2026-08-05', today)).toEqual({
      lead: 'आज',
      detail: 'बुधवार, 05/08/2026',
    });
  });

  it('leads with the date for older days, weekday underneath', () => {
    expect(dayHeadline('2026-07-28', today)).toEqual({
      lead: '28/07/2026',
      detail: 'मंगलवार',
    });
  });
});

describe('money', () => {
  // The screen gets held up next to the paper slip.
  it('keeps the paise on a single delivery', () => {
    expect(formatRupees(548.6)).toBe('₹548.60');
    expect(formatRupees(1054.09)).toBe('₹1,054.09');
  });

  it('groups the Indian way, not the western way', () => {
    expect(formatRupeesRounded(105430)).toBe('₹1,05,430');
    expect(formatRupeesRounded(1234567)).toBe('₹12,34,567');
  });

  it('uses ordinary digits, which are quicker to read than Devanagari ones', () => {
    expect(formatRupees(1234.5)).toMatch(/^₹[\d,.]+$/);
  });

  it('rounds rollups to the rupee', () => {
    expect(formatRupeesRounded(1054.49)).toBe('₹1,054');
    expect(formatRupeesRounded(1054.5)).toBe('₹1,055');
  });

  it('shows zero rather than NaN for missing amounts', () => {
    expect(formatRupees(undefined)).toBe('₹0.00');
    expect(formatRupees(null)).toBe('₹0.00');
    expect(formatRupeesRounded('' as unknown)).toBe('₹0');
  });

  it('keeps a refund or correction visibly negative', () => {
    expect(formatRupees(-25.5)).toBe('₹-25.50');
  });
});

describe('quantities and quality', () => {
  it('shows litres to the same two places as the slip', () => {
    expect(formatLitres(6.5)).toBe('6.50');
    expect(formatLitres(12.456)).toBe('12.46');
  });

  it('drops to one place for totals, where the second digit is noise', () => {
    expect(formatLitresShort(12.46)).toBe('12.5');
  });

  it('shows fat and SNF to one place, as the slip does', () => {
    expect(formatPercent(4.25)).toBe('4.3');
    expect(formatPercent(8)).toBe('8.0');
  });
});

describe('species', () => {
  it('names the animal in Hindi whatever casing the row was saved with', () => {
    expect(speciesHindi('Cow')).toBe('गाय');
    expect(speciesHindi('cow')).toBe('गाय');
    expect(speciesHindi('BUFFALO')).toBe('भैंस');
  });

  it('says nothing when the row has no species', () => {
    expect(speciesHindi(null)).toBeNull();
    expect(speciesHindi('  ')).toBeNull();
  });

  it('passes an unknown species through rather than mislabelling it', () => {
    expect(speciesHindi('Mixed')).toBe('Mixed');
  });
});

describe('collection time', () => {
  it('reads as a twelve hour clock with the Hindi half of day', () => {
    expect(formatClockTime(new Date(2026, 7, 5, 6, 42).toISOString())).toBe('06:42 सुबह');
    expect(formatClockTime(new Date(2026, 7, 5, 18, 10).toISOString())).toBe('06:10 शाम');
  });

  it('calls midnight and noon by the right hour', () => {
    expect(formatClockTime(new Date(2026, 7, 5, 0, 5).toISOString())).toBe('12:05 सुबह');
    expect(formatClockTime(new Date(2026, 7, 5, 12, 0).toISOString())).toBe('12:00 शाम');
  });

  it('is absent rather than wrong when the row has no timestamp', () => {
    expect(formatClockTime(null)).toBeNull();
    expect(formatClockTime('not a time')).toBeNull();
  });
});
