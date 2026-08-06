import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSlipPreview,
  getAutoCut,
  setAutoCut,
  getCompatibilityMode,
  setCompatibilityMode,
  nextSmallerChunk,
  CHUNK_SIZES,
  SAFE_CHUNK_SIZE,
  createPacer,
  pacerDelay,
  PRINTER_BURST_BYTES,
  PRINTER_BYTES_PER_SEC,
  type CollectionSlipData,
} from './thermalPrinting';
import { DEFAULT_SLIP_TEMPLATE } from './slipTemplate';

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


describe('chunk size negotiation', () => {
  // Web Bluetooth hides the negotiated MTU, so the transport steps down until
  // a write is accepted. Getting this wrong either wastes throughput or loops.
  it('steps down through every candidate size', () => {
    expect(nextSmallerChunk(180)).toBe(100);
    expect(nextSmallerChunk(100)).toBe(60);
    expect(nextSmallerChunk(60)).toBe(20);
  });

  it('reports no smaller size at the floor, so the error surfaces', () => {
    expect(nextSmallerChunk(SAFE_CHUNK_SIZE)).toBeNull();
  });

  it('never suggests a size at or above the current one', () => {
    for (const size of CHUNK_SIZES) {
      const next = nextSmallerChunk(size);
      if (next !== null) expect(next).toBeLessThan(size);
    }
  });

  it('bottoms out at the size a default-MTU printer can take', () => {
    expect(CHUNK_SIZES[CHUNK_SIZES.length - 1]).toBe(SAFE_CHUNK_SIZE);
  });

  it('is ordered largest first so the fast path is tried before fallbacks', () => {
    const sorted = [...CHUNK_SIZES].sort((a, b) => b - a);
    expect([...CHUNK_SIZES]).toEqual(sorted);
  });
});

describe('compatibility mode', () => {
  it('is off by default, so printers get the fast path first', () => {
    expect(getCompatibilityMode()).toBe(false);
  });

  it('round-trips', () => {
    setCompatibilityMode(true);
    expect(getCompatibilityMode()).toBe(true);
    setCompatibilityMode(false);
    expect(getCompatibilityMode()).toBe(false);
  });
});


describe('slip composition from the template', () => {
  it('prints the configured business name at the top', () => {
    const text = getSlipPreview(slip(), DEFAULT_SLIP_TEMPLATE);
    expect(text).toContain('श्रीLalita By Maharani Farm');
    // The old fixed header is gone.
    expect(text).not.toContain('DAIRY COLLECTION SLIP');
  });

  it('prints the configured footer instead of the old fixed one', () => {
    const text = getSlipPreview(slip(), DEFAULT_SLIP_TEMPLATE);
    expect(text).toContain('धन्यवाद!');
    expect(text).not.toContain('Thank you!');
  });

  it('omits lines left blank rather than printing empty space', () => {
    const text = getSlipPreview(
      slip(),
      { ...DEFAULT_SLIP_TEMPLATE, tagline: '', footerMessage: '', contactLine: '' }
    );
    expect(text).not.toContain('Collection Slip');
    expect(text).not.toContain('धन्यवाद');
  });

  it('drops the brand entirely in none mode', () => {
    const text = getSlipPreview(slip(), { ...DEFAULT_SLIP_TEMPLATE, brandMode: 'none' });
    expect(text).not.toContain('श्रीLalita');
  });

  it('marks where a logo will print', () => {
    const text = getSlipPreview(slip(), {
      ...DEFAULT_SLIP_TEMPLATE,
      brandMode: 'logo',
      logo: { bits: 'AA', widthDots: 384, heightDots: 40 },
    });
    expect(text).toContain('[ logo ]');
  });

  it('still prints the figures, whatever the branding', () => {
    const text = getSlipPreview(slip(), { ...DEFAULT_SLIP_TEMPLATE, brandMode: 'none' });
    expect(text).toContain('Farmer: RAMESH PATEL');
    expect(text).toContain('TOTAL:        Rs.1054.09');
  });

  it('keeps every rule the same width', () => {
    const lines = getSlipPreview(slip(), DEFAULT_SLIP_TEMPLATE).split('\n');
    const rules = lines.filter((l) => /^[=-]+$/.test(l));
    expect(rules.length).toBeGreaterThan(0);
    expect(new Set(rules.map((r) => r.length))).toEqual(new Set([32]));
  });
});

describe('pacing writes to the printer', () => {
  // Bluetooth gives no backpressure -- writeValueWithoutResponse resolves when
  // the chunk reaches the radio, not when the printer has burned it. Without
  // this the QR overruns the buffer and the slip stops halfway.
  const send = (bytes: number[], rate = PRINTER_BYTES_PER_SEC, burst = PRINTER_BURST_BYTES) => {
    const pacer = createPacer(0, burst, rate);
    let clock = 0;
    let waited = 0;
    for (const n of bytes) {
      const wait = pacerDelay(pacer, n, clock);
      waited += wait;
      clock += wait; // a caller that actually sleeps advances the clock
    }
    return waited;
  };

  it('lets an opening burst through untouched, because the buffer starts empty', () => {
    expect(send(Array(5).fill(180))).toBe(0);
  });

  // A text-only slip is a few hundred bytes. The speed work must not regress.
  it('never delays a slip small enough to fit the burst', () => {
    expect(send([180, 180, 180, 60])).toBe(0);
  });

  it('starts holding back once the burst is spent', () => {
    expect(send(Array(12).fill(180))).toBeGreaterThan(0);
  });

  it('settles at the printer speed, not the radio speed', () => {
    const total = 8000;
    const waited = send(Array(total / 100).fill(100));
    // Everything past the free burst has to be paid for at the drain rate.
    const expected = ((total - PRINTER_BURST_BYTES) / PRINTER_BYTES_PER_SEC) * 1000;
    expect(waited).toBeGreaterThan(expected * 0.9);
    expect(waited).toBeLessThan(expected * 1.1);
  });

  it('refills while the caller is busy, so a slow link is not throttled twice', () => {
    const pacer = createPacer(0, 1024, 8000);
    pacerDelay(pacer, 1024, 0); // spend it all
    // 500ms of a slow radio is 4000 bytes of headroom; the bucket caps at 1024.
    expect(pacerDelay(pacer, 500, 500)).toBe(0);
  });

  it('does not bank more credit than the buffer can hold', () => {
    const pacer = createPacer(0, 1024, 8000);
    pacerDelay(pacer, 1024, 0);
    pacerDelay(pacer, 0, 10_000); // idle a long time
    expect(pacerDelay(pacer, 1024, 10_000)).toBe(0);
    expect(pacerDelay(pacer, 1024, 10_000)).toBeGreaterThan(0);
  });

  it('waits long enough to cover a chunk bigger than the whole bucket', () => {
    const pacer = createPacer(0, 100, 1000);
    pacerDelay(pacer, 100, 0);
    expect(pacerDelay(pacer, 500, 0)).toBe(500);
  });

  it('keeps a real QR under a second of pacing', () => {
    const qrBytes = 6600;
    const waited = send(Array(Math.ceil(qrBytes / 180)).fill(180));
    expect(waited).toBeLessThan(1000);
  });

  it('never runs the clock backwards when time goes wrong', () => {
    const pacer = createPacer(1000, 1024, 8000);
    expect(pacerDelay(pacer, 180, 0)).toBe(0);
    expect(pacer.credit).toBeLessThanOrEqual(1024);
  });
});
