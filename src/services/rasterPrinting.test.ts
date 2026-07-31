import { describe, it, expect } from 'vitest';
import {
  packMonochrome,
  rasterToEscPos,
  bytesPerRow,
  blankRaster,
  stackRasters,
  needsRaster,
  ditherFloydSteinberg,
  PAPER_DOTS,
  type Raster,
} from './rasterPrinting';

// Build greyscale from a picture drawn as text: '#' is black, '.' is white.
const grey = (rows: string[]): { data: Uint8Array; width: number; height: number } => {
  const width = rows[0].length;
  const data = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      data[y * width + x] = ch === '#' ? 0 : 255;
    });
  });
  return { data, width, height: rows.length };
};

describe('bit packing', () => {
  it('packs eight dots into one byte, leftmost dot in the high bit', () => {
    const { data, width, height } = grey(['#.......']);
    expect(packMonochrome(data, width, height).bits[0]).toBe(0b10000000);
  });

  it('packs the rightmost dot into the low bit', () => {
    const { data, width, height } = grey(['.......#']);
    expect(packMonochrome(data, width, height).bits[0]).toBe(0b00000001);
  });

  it('packs a mixed row in the order it was drawn', () => {
    const { data, width, height } = grey(['#.##...#']);
    expect(packMonochrome(data, width, height).bits[0]).toBe(0b10110001);
  });

  it('treats dark as black and light as white', () => {
    // Threshold is exclusive: exactly at the threshold stays white.
    const data = new Uint8Array([0, 127, 128, 255, 255, 255, 255, 255]);
    expect(packMonochrome(data, 8, 1, 128).bits[0]).toBe(0b11000000);
  });

  it('honours a custom threshold', () => {
    const data = new Uint8Array([200, 200, 200, 200, 200, 200, 200, 200]);
    expect(packMonochrome(data, 8, 1, 128).bits[0]).toBe(0x00);
    expect(packMonochrome(data, 8, 1, 220).bits[0]).toBe(0xff);
  });

  it('pads a part-byte row with white and reports the padded width', () => {
    // Three dots occupy one byte; the unused five must not print.
    const { data, width, height } = grey(['##.']);
    const raster = packMonochrome(data, width, height);
    expect(raster.width).toBe(8);
    expect(raster.bits).toHaveLength(1);
    expect(raster.bits[0]).toBe(0b11000000);
  });

  it('keeps rows separate rather than running them together', () => {
    const { data, width, height } = grey(['#.......', '.......#']);
    const raster = packMonochrome(data, width, height);
    expect([...raster.bits]).toEqual([0b10000000, 0b00000001]);
  });

  it('refuses input that is too short to describe the image', () => {
    expect(() => packMonochrome(new Uint8Array(4), 8, 2)).toThrow(/expected 16 samples/);
  });
});

describe('row width', () => {
  it('rounds up to whole bytes', () => {
    expect(bytesPerRow(8)).toBe(1);
    expect(bytesPerRow(9)).toBe(2);
    expect(bytesPerRow(PAPER_DOTS)).toBe(48);
  });
});

describe('GS v 0 framing', () => {
  const raster = (w: number, h: number): Raster => blankRaster(w, h);

  it('opens with the raster bit image command in normal size', () => {
    expect(rasterToEscPos(raster(8, 1)).slice(0, 4)).toEqual([0x1d, 0x76, 0x30, 0x00]);
  });

  // The x field counts BYTES and the y field counts DOTS. Confusing them prints
  // the image eight times too wide, which is the classic failure here.
  it('sends width in bytes and height in dots', () => {
    const bytes = rasterToEscPos(raster(PAPER_DOTS, 100));
    expect(bytes[4]).toBe(48); // 384 dots = 48 bytes
    expect(bytes[5]).toBe(0);
    expect(bytes[6]).toBe(100);
    expect(bytes[7]).toBe(0);
  });

  it('encodes a height above 255 across both bytes, little endian', () => {
    const bytes = rasterToEscPos(raster(8, 300));
    expect(bytes[6]).toBe(300 & 0xff);
    expect(bytes[7]).toBe(300 >> 8);
  });

  it('carries every pixel byte after the header', () => {
    const { data, width, height } = grey(['#.##...#', '.#..###.']);
    const bytes = rasterToEscPos(packMonochrome(data, width, height));
    expect(bytes).toHaveLength(8 + 2);
    expect(bytes.slice(8)).toEqual([0b10110001, 0b01001110]);
  });

  it('rejects a raster whose data does not match its dimensions', () => {
    const broken: Raster = { width: 16, height: 4, bits: new Uint8Array(3) };
    expect(() => rasterToEscPos(broken)).toThrow(/expected 8/);
  });

  it('rejects an image taller than one command can express', () => {
    const tall: Raster = { width: 8, height: 70000, bits: new Uint8Array(70000) };
    expect(() => rasterToEscPos(tall)).toThrow(/taller than one raster command/);
  });
});

describe('stacking', () => {
  it('sums heights and preserves order', () => {
    const a = packMonochrome(grey(['########']).data, 8, 1);
    const b = packMonochrome(grey(['........']).data, 8, 1);
    const stacked = stackRasters([a, b]);
    expect(stacked.height).toBe(2);
    expect([...stacked.bits]).toEqual([0xff, 0x00]);
  });

  it('refuses to stack mismatched widths, which would shear the image', () => {
    expect(() => stackRasters([blankRaster(8, 1), blankRaster(16, 1)])).toThrow(/same width/);
  });

  it('returns an empty raster for no input', () => {
    expect(stackRasters([]).height).toBe(0);
  });
});

describe('choosing text or picture', () => {
  it('lets plain ASCII take the fast text path', () => {
    expect(needsRaster('Lalita By Maharani Farm')).toBe(false);
    expect(needsRaster('TOTAL: Rs.1054.09')).toBe(false);
  });

  // The whole reason this module exists.
  it('sends Devanagari down the picture path', () => {
    expect(needsRaster('श्रीLalita By Maharani Farm')).toBe(true);
    expect(needsRaster('धन्यवाद')).toBe(true);
  });

  it('also catches symbols the printer has no glyph for', () => {
    expect(needsRaster('₹1054')).toBe(true);
    expect(needsRaster('—')).toBe(true);
  });
});

describe('dithering', () => {
  it('drives every pixel to pure black or white', () => {
    const data = new Uint8Array([10, 60, 120, 180, 200, 240, 90, 30]);
    ditherFloydSteinberg(data, 8, 1);
    expect([...data].every((v) => v === 0 || v === 255)).toBe(true);
  });

  it('keeps a flat mid grey roughly half covered, rather than all one colour', () => {
    const w = 32;
    const h = 32;
    const data = new Uint8Array(w * h).fill(128);
    ditherFloydSteinberg(data, w, h);
    const black = [...data].filter((v) => v === 0).length;
    expect(black).toBeGreaterThan(w * h * 0.2);
    expect(black).toBeLessThan(w * h * 0.8);
  });

  it('leaves solid black and solid white alone', () => {
    const black = new Uint8Array(64).fill(0);
    ditherFloydSteinberg(black, 8, 8);
    expect([...black].every((v) => v === 0)).toBe(true);

    const white = new Uint8Array(64).fill(255);
    ditherFloydSteinberg(white, 8, 8);
    expect([...white].every((v) => v === 255)).toBe(true);
  });
});
