import { describe, it, expect, beforeEach } from 'vitest';
import { getSlipPreview, getAutoCut, setAutoCut, type CollectionSlipData } from './thermalPrinting';

// localStorage is not present in the node test environment; the printing module
// only uses it for simple string settings, so a minimal stand-in is enough.
const memoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
};

beforeEach(() => {
  (globalThis as any).localStorage = memoryStorage();
});

const slip = (over: Partial<CollectionSlipData> = {}): CollectionSlipData => ({
  farmerName: 'RAMESH PATEL',
  farmerCode: '1234',
  date: '2026-08-01',
  session: 'morning',
  quantity: 15.6,
  fatPercentage: 7.2,
  snfPercentage: 9.1,
  ratePerLiter: 67.57,
  totalAmount: 1054.09,
  species: 'Buffalo',
  ...over,
});

describe('species label', () => {
  // Collections store species capitalised. The builder used to compare against
  // lowercase literals, so every slip printed 'Mixed'.
  it('prints the stored capitalised species', () => {
    expect(getSlipPreview(slip({ species: 'Cow' }))).toContain('Species: Cow');
    expect(getSlipPreview(slip({ species: 'Buffalo' }))).toContain('Species: Buffalo');
  });

  it('matches regardless of case', () => {
    expect(getSlipPreview(slip({ species: 'cow' }))).toContain('Species: Cow');
    expect(getSlipPreview(slip({ species: 'BUFFALO' }))).toContain('Species: Buffalo');
  });

  it('falls back to Mixed only for genuinely unknown values', () => {
    expect(getSlipPreview(slip({ species: 'goat' }))).toContain('Species: Mixed');
    expect(getSlipPreview(slip({ species: '' }))).toContain('Species: Mixed');
  });
});

describe('slip arithmetic', () => {
  // A farmer can multiply the two printed numbers by hand. They have to agree.
  it('reconciles quantity x printed rate with the printed total', () => {
    const data = slip({ quantity: 15.6, ratePerLiter: 67.57, totalAmount: 15.6 * 67.57 });
    const text = getSlipPreview(data);
    const rate = Number(text.match(/Rate:\s+Rs\.([\d.]+)\/L/)![1]);
    const total = Number(text.match(/TOTAL:\s+Rs\.([\d.]+)/)![1]);
    expect(Number((data.quantity * rate).toFixed(2))).toBeCloseTo(total, 2);
  });
});

describe('rate list version', () => {
  it('names the rate list that priced the collection', () => {
    expect(getSlipPreview(slip({ rateEffectiveFrom: '2026-08-01' }))).toContain(
      'Rate list:    2026-08-01'
    );
  });

  it('marks an evening-session rate list', () => {
    const text = getSlipPreview(
      slip({ rateEffectiveFrom: '2026-08-01', rateEffectiveSession: 'evening' })
    );
    expect(text).toContain('Rate list:    2026-08-01 PM');
  });

  // Collections recorded before the version was tracked have nothing to state.
  it('omits the line when no version was recorded', () => {
    expect(getSlipPreview(slip())).not.toContain('Rate list:');
  });
});

describe('auto cut setting', () => {
  it('defaults to off so an untested printer cannot spoil slips', () => {
    expect(getAutoCut()).toBe(false);
  });

  it('round-trips', () => {
    setAutoCut(true);
    expect(getAutoCut()).toBe(true);
    setAutoCut(false);
    expect(getAutoCut()).toBe(false);
  });
});
