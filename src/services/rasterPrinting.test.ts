import { describe, it, expect } from 'vitest';
import {
  packMonochrome,
  rasterToEscPos,
  bytesPerRow,
  blankRaster,
  stackRasters,
  needsRaster,
  ditherFloydSteinberg,
  invertGrey,
  inkCoverage,
  renderQrRaster,
  qrModuleDotsToFit,
  sliceRaster,
  rasterToEscPosBanded,
  centeredRaster,
  PAPER_DOTS,
  QR_MAX_MODULE_DOTS,
  RASTER_BAND_DOTS,
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


describe('inverting', () => {
  // Screen artwork is often light lettering on a dark field. Printed as-is that
  // burns almost the whole area; lifted onto transparency it prints nothing.
  it('swaps black and white', () => {
    const g = new Uint8Array([0, 255, 128, 200]);
    invertGrey(g);
    expect([...g]).toEqual([255, 0, 127, 55]);
  });

  it('is its own undo', () => {
    const original = [12, 200, 77, 255, 0];
    const g = new Uint8Array(original);
    invertGrey(g);
    invertGrey(g);
    expect([...g]).toEqual(original);
  });
});

describe('ink coverage', () => {
  it('is nothing for blank paper', () => {
    expect(inkCoverage(blankRaster(8, 4))).toBe(0);
  });

  it('is everything for a solid block', () => {
    const solid = packMonochrome(new Uint8Array(64).fill(0), 8, 8);
    expect(inkCoverage(solid)).toBe(1);
  });

  it('measures a partly filled image', () => {
    const half = packMonochrome(grey(['####....']).data, 8, 1);
    expect(inkCoverage(half)).toBeCloseTo(0.5, 5);
  });

  it('reports an empty raster as nothing rather than dividing by zero', () => {
    expect(inkCoverage(blankRaster(8, 0))).toBe(0);
  });
});

describe('QR rendering', () => {
  // A checkerboard stands in for a real code: it exercises module placement
  // without depending on the encoder.
  const matrix = (size: number) => ({ size, get: (x: number, y: number) => (x + y) % 2 === 0 });

  it('surrounds the code with a quiet zone, which scanners need', () => {
    const r = renderQrRaster(matrix(21), { moduleDots: 2, quietModules: 4 });
    expect(r.height).toBe((21 + 8) * 2);
    // The outer margin must be blank or the code often will not read.
    expect(r.bits[0]).toBe(0);
  });

  it('scales each module to the requested block of dots', () => {
    const small = renderQrRaster(matrix(21), { moduleDots: 2, quietModules: 0 });
    const large = renderQrRaster(matrix(21), { moduleDots: 6, quietModules: 0 });
    expect(large.height).toBe(small.height * 3);
  });

  // The code itself is square; the raster's width is that rounded up to a whole
  // byte, and the extra dots are white, so it prints as a slightly wider right
  // margin rather than a distorted code.
  it('is square in content, padded to a byte boundary in width', () => {
    const side = (25 + 8) * 4;
    const r = renderQrRaster(matrix(25), { moduleDots: 4, quietModules: 4 });
    expect(r.height).toBe(side);
    expect(r.width).toBe(bytesPerRow(side) * 8);
    expect(r.width - side).toBeLessThan(8);
  });

  it('actually marks dots for set modules', () => {
    expect(inkCoverage(renderQrRaster(matrix(21), { moduleDots: 3, quietModules: 0 }))).toBeGreaterThan(0.4);
  });
});

describe('fitting a QR to the paper', () => {
  it('never exceeds the paper width', () => {
    for (const modules of [21, 25, 29, 33, 41, 57]) {
      const scale = qrModuleDotsToFit(modules);
      expect((modules + 8) * scale).toBeLessThanOrEqual(PAPER_DOTS);
    }
  });

  // Capped rather than maximised: a full-width code is ~16KB, which overruns
  // the printer's buffer, and buys nothing -- five dots is already a 0.6mm
  // module at 203dpi.
  it('stops growing at the cap even when the paper has room', () => {
    for (const modules of [21, 25, 29, 33]) {
      expect(qrModuleDotsToFit(modules)).toBe(QR_MAX_MODULE_DOTS);
    }
  });

  it('shrinks below the cap once the code stops fitting', () => {
    const scale = qrModuleDotsToFit(150);
    expect(scale).toBeLessThan(QR_MAX_MODULE_DOTS);
    expect((150 + 8) * (scale + 1)).toBeGreaterThan(PAPER_DOTS);
  });

  // The trap this replaced: a shorter URL means fewer modules, so uncapped it
  // produced a physically bigger code and a bigger payload, not a smaller one.
  it('keeps the payload bounded no matter how short the link is', () => {
    for (const modules of [21, 25, 29, 33, 37]) {
      const side = (modules + 8) * qrModuleDotsToFit(modules);
      expect(bytesPerRow(side) * side).toBeLessThan(8000);
    }
  });

  // A code one dot per module is unreadable off thermal paper, but printing
  // something beats printing nothing.
  it('never drops below one dot per module', () => {
    expect(qrModuleDotsToFit(500)).toBe(1);
  });
});

describe('slicing', () => {
  const striped = packMonochrome(
    grey(['########', '........', '########', '........']).data,
    8,
    4
  );

  it('takes the rows asked for and no others', () => {
    const s = sliceRaster(striped, 1, 2);
    expect(s.height).toBe(2);
    expect([...s.bits]).toEqual([0x00, 0xff]);
  });

  it('keeps the width, so bands still line up under each other', () => {
    expect(sliceRaster(striped, 0, 1).width).toBe(striped.width);
  });

  it('clips rather than running off the end of the image', () => {
    expect(sliceRaster(striped, 3, 10).height).toBe(1);
    expect(sliceRaster(striped, 9, 4).height).toBe(0);
  });
});

describe('banding a tall image', () => {
  // The bug this exists for: one GS v 0 carrying a whole QR code is ~16KB,
  // which overruns a cheap printer's buffer. It prints half the image and
  // silently drops the footer and the cut with the rest.
  it('splits into one command per band', () => {
    const bytes = rasterToEscPosBanded(blankRaster(8, 96), 24);
    const headers = bytes.filter(
      (_, i) => bytes[i] === 0x1d && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x30
    );
    expect(headers).toHaveLength(4);
  });

  it('gives every band the height it actually carries', () => {
    const bytes = rasterToEscPosBanded(blankRaster(8, 50), 24);
    // 24 + 24 + 2: the last band is short, and must say so or the printer
    // reads pixel data as the next command.
    expect([bytes[6], bytes[8 + 24 + 6], bytes[(8 + 24) * 2 + 6]]).toEqual([24, 24, 2]);
  });

  it('carries exactly the same pixels as one big command would', () => {
    const raster = packMonochrome(
      grey(['#.##...#', '.#..###.', '########', '........']).data,
      8,
      4
    );
    const banded = rasterToEscPosBanded(raster, 2);
    const pixels = banded.filter((_, i) => i % 10 >= 8);
    expect(pixels).toEqual([...raster.bits]);
  });

  it('sends one command when the image already fits a band', () => {
    expect(rasterToEscPosBanded(blankRaster(8, 10), 24)).toHaveLength(8 + 10);
  });

  it('emits nothing for an empty image', () => {
    expect(rasterToEscPosBanded(blankRaster(8, 0))).toEqual([]);
  });

  it('rejects a mismatched raster up front, not half way through printing', () => {
    const broken: Raster = { width: 8, height: 4, bits: new Uint8Array(3) };
    expect(() => rasterToEscPosBanded(broken)).toThrow(/expected 4/);
  });

  it('refuses a band height that would never finish', () => {
    expect(() => rasterToEscPosBanded(blankRaster(8, 4), 0)).toThrow(/at least one dot/);
  });

  it('keeps a real QR comfortably under the buffer, per command', () => {
    const matrix = { size: 37, get: (x: number, y: number) => (x + y) % 2 === 0 };
    const qr = renderQrRaster(matrix, { moduleDots: qrModuleDotsToFit(37) });
    const perBand = bytesPerRow(qr.width) * RASTER_BAND_DOTS + 8;
    expect(perBand).toBeLessThan(2048);
  });
});

describe('centring an image', () => {
  it('sets centre alignment, then puts it back', () => {
    const bytes = centeredRaster(blankRaster(8, 4));
    expect(bytes.slice(0, 3)).toEqual([0x1b, 0x61, 0x01]);
    expect(bytes.slice(-3)).toEqual([0x1b, 0x61, 0x00]);
  });

  it('bands what it wraps, so a tall image is safe to centre', () => {
    const bytes = centeredRaster(blankRaster(8, 96));
    const headers = bytes.filter(
      (_, i) => bytes[i] === 0x1d && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x30
    );
    expect(headers.length).toBeGreaterThan(1);
  });
});
