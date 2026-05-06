// Helpers for fortnightly payout cycles (1-15 / 16-EOM, IST)

export function istNow(): Date {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  return new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60000);
}

export function getCycleForDate(d: Date): { start: string; end: string; half: 'first' | 'second'; year_month: string } {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed
  const day = d.getDate();
  let startDay: number, endDay: number, half: 'first' | 'second';
  if (day <= 15) {
    startDay = 1; endDay = 15; half = 'first';
  } else {
    startDay = 16;
    endDay = new Date(y, m + 1, 0).getDate();
    half = 'second';
  }
  const fmt = (yy: number, mm: number, dd: number) =>
    `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return {
    start: fmt(y, m, startDay),
    end: fmt(y, m, endDay),
    half,
    year_month: `${y}-${String(m + 1).padStart(2, '0')}`,
  };
}

export function getPreviousCycle(d: Date) {
  const day = d.getDate();
  if (day <= 15) {
    // previous = second half of previous month
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 16);
    return getCycleForDate(prev);
  }
  // previous = first half of same month
  return getCycleForDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function billNumber(year_month: string, half: 'first' | 'second', farmerCode: string) {
  const suffix = half === 'first' ? 'A' : 'B';
  return `${year_month}-${suffix}-${farmerCode}`;
}
