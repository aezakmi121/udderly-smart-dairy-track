// Turning pictures into ESC/POS raster commands.
//
// The text path of the printer can only send bytes the printer already has a
// glyph for, which rules out Devanagari on the cheap hardware this runs on.
// Sending pixels instead sidesteps fonts and codepages entirely: whatever the
// browser can draw, the printer can reproduce. That covers the farm name, a
// logo, and a QR code with one mechanism.
//
// The pure parts -- thresholding, bit packing, command framing -- live here and
// are exercised by tests. Anything that needs a canvas is kept as a thin shell
// on top, because there is no canvas in the test environment.

const ESC = 0x1b;
const GS = 0x1d;

// 58mm paper at 203dpi. Kept here rather than inlined so an 80mm printer is a
// one-line change (576) rather than a hunt through the codebase.
export const PAPER_DOTS = 384;

export interface Raster {
  /** Width in dots. Always a multiple of 8 -- rows are packed into whole bytes. */
  width: number;
  /** Height in dots. */
  height: number;
  /** 1 bit per dot, row-major, most significant bit leftmost. 1 = black. */
  bits: Uint8Array;
}

/** Round up to the next whole byte, since a raster row cannot be a part byte. */
export const bytesPerRow = (widthDots: number): number => Math.ceil(widthDots / 8);

/**
 * Pack 8-bit greyscale into 1 bit per dot.
 *
 * Thermal paper is black or nothing, so every pixel has to fall to one side.
 * Anything darker than the threshold burns. Rows are padded to a byte boundary
 * with white, which is what the printer expects and what keeps a raster's width
 * safe to divide by 8 everywhere else.
 */
export const packMonochrome = (
  grey: Uint8Array,
  width: number,
  height: number,
  threshold = 128
): Raster => {
  if (grey.length < width * height) {
    throw new Error(`packMonochrome: expected ${width * height} samples, got ${grey.length}`);
  }
  const rowBytes = bytesPerRow(width);
  const bits = new Uint8Array(rowBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grey[y * width + x] < threshold) {
        // Bit 7 is the leftmost dot of each byte.
        bits[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return { width: rowBytes * 8, height, bits };
};

/**
 * Frame a raster as GS v 0 -- "print raster bit image".
 *
 * Layout: GS v 0 m xL xH yL yH d1..dk, where the x pair is the row width in
 * BYTES and the y pair is the height in DOTS, both little endian. Getting those
 * units mixed up prints garbage eight times too wide, so they are covered by
 * tests.
 */
export const rasterToEscPos = (raster: Raster): number[] => {
  const rowBytes = bytesPerRow(raster.width);
  if (raster.bits.length !== rowBytes * raster.height) {
    throw new Error(
      `rasterToEscPos: ${raster.bits.length} bytes for a ${raster.width}x${raster.height} raster, expected ${rowBytes * raster.height}`
    );
  }
  // The height field is 16 bit, so a very tall image has to be split. Nothing
  // printed here comes close, but failing loudly beats printing nonsense.
  if (raster.height > 0xffff) {
    throw new Error(`rasterToEscPos: ${raster.height} dots is taller than one raster command allows`);
  }

  return [
    GS,
    0x76,
    0x30,
    0x00, // m = 0: normal size
    rowBytes & 0xff,
    (rowBytes >> 8) & 0xff,
    raster.height & 0xff,
    (raster.height >> 8) & 0xff,
    ...raster.bits,
  ];
};

/** Blank raster of a given height -- used for spacing above and below images. */
export const blankRaster = (widthDots: number, heightDots: number): Raster => ({
  width: bytesPerRow(widthDots) * 8,
  height: heightDots,
  bits: new Uint8Array(bytesPerRow(widthDots) * heightDots),
});

/** Stack rasters vertically. They must already share a width. */
export const stackRasters = (rasters: Raster[]): Raster => {
  if (rasters.length === 0) return blankRaster(PAPER_DOTS, 0);
  const width = rasters[0].width;
  if (rasters.some((r) => r.width !== width)) {
    throw new Error('stackRasters: every raster must have the same width');
  }
  const height = rasters.reduce((sum, r) => sum + r.height, 0);
  const bits = new Uint8Array(bytesPerRow(width) * height);
  let offset = 0;
  for (const r of rasters) {
    bits.set(r.bits, offset);
    offset += r.bits.length;
  }
  return { width, height, bits };
};

/** Does this string need the picture path, or can the printer set it as text? */
export const needsRaster = (text: string): boolean => {
  for (const ch of text) {
    if (ch.codePointAt(0)! > 0x7f) return true;
  }
  return false;
};

// ---------------------------------------------------------------------------
// Canvas-backed rendering. Browser only.
// ---------------------------------------------------------------------------

export interface TextRasterOptions {
  widthDots?: number;
  fontSizePx?: number;
  bold?: boolean;
  /** Devanagari needs a font that actually has the glyphs; Noto is the usual one. */
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  threshold?: number;
  paddingPx?: number;
}

const canvasToGrey = (ctx: CanvasRenderingContext2D, width: number, height: number): Uint8Array => {
  const { data } = ctx.getImageData(0, 0, width, height);
  const grey = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Composite against white, so transparent areas read as paper rather than black.
    const alpha = data[i + 3] / 255;
    const r = data[i] * alpha + 255 * (1 - alpha);
    const g = data[i + 1] * alpha + 255 * (1 - alpha);
    const b = data[i + 2] * alpha + 255 * (1 - alpha);
    grey[p] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return grey;
};

/** Draw a line of text and return it as a printable raster. */
export const renderTextRaster = (text: string, opts: TextRasterOptions = {}): Raster => {
  const width = opts.widthDots ?? PAPER_DOTS;
  const fontSize = opts.fontSizePx ?? 28;
  const padding = opts.paddingPx ?? 4;
  const family = opts.fontFamily ?? "'Noto Sans Devanagari', 'Noto Sans', sans-serif";
  const height = Math.ceil(fontSize * 1.4) + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available, so the slip header cannot be rendered');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000';
  ctx.font = `${opts.bold ? 'bold ' : ''}${fontSize}px ${family}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = opts.align ?? 'center';
  const x = opts.align === 'left' ? padding : opts.align === 'right' ? width - padding : width / 2;
  ctx.fillText(text, x, height / 2, width - padding * 2);

  return packMonochrome(canvasToGrey(ctx, width, height), width, height, opts.threshold);
};

export interface ImageRasterOptions {
  widthDots?: number;
  maxHeightDots?: number;
  threshold?: number;
  /** Photographs need dithering; line art and logos look better hard-thresholded. */
  dither?: boolean;
  /**
   * Swap black and white.
   *
   * Artwork designed for a screen is often light lettering on a dark field. On
   * thermal paper dark means burn, so that prints as a near-solid block with the
   * lettering knocked out -- slow, ugly, and hard on the head. Worse, lettering
   * lifted onto a transparent background composites to white and prints nothing
   * at all. Inverting turns such artwork into black marks on bare paper.
   */
  invert?: boolean;
}

/**
 * Scale an already-loaded image to the paper width and reduce it to one bit.
 *
 * Floyd-Steinberg is offered for photographs, where a hard threshold collapses
 * shading into blotches. A logo is usually flat colour and looks sharper without.
 */
export const renderImageRaster = (
  image: CanvasImageSource & { width: number; height: number },
  opts: ImageRasterOptions = {}
): Raster => {
  const width = opts.widthDots ?? PAPER_DOTS;
  const scale = width / image.width;
  let height = Math.round(image.height * scale);
  if (opts.maxHeightDots && height > opts.maxHeightDots) height = opts.maxHeightDots;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available, so the logo cannot be rendered');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const grey = canvasToGrey(ctx, width, height);
  if (opts.invert) invertGrey(grey);
  if (opts.dither) ditherFloydSteinberg(grey, width, height, opts.threshold ?? 128);
  return packMonochrome(grey, width, height, opts.threshold);
};

/** Flip light and dark in place. */
export const invertGrey = (grey: Uint8Array): void => {
  for (let i = 0; i < grey.length; i++) grey[i] = 255 - grey[i];
};

/**
 * How much of a raster would actually burn.
 *
 * A mostly black image prints slowly and reads as a blot, so this lets the UI
 * warn before paper is spent rather than after.
 */
export const inkCoverage = (raster: Raster): number => {
  if (raster.height === 0) return 0;
  let lit = 0;
  for (let i = 0; i < raster.bits.length; i++) {
    let b = raster.bits[i];
    while (b) {
      lit += b & 1;
      b >>= 1;
    }
  }
  return lit / (bytesPerRow(raster.width) * 8 * raster.height);
};

/**
 * A QR code as a printable raster.
 *
 * Each QR module becomes a square block of dots, with a quiet zone around it --
 * scanners need that margin, and a code printed flush to its neighbours often
 * will not read at all.
 */
export const renderQrRaster = (
  matrix: { size: number; get: (x: number, y: number) => boolean },
  opts: { moduleDots?: number; quietModules?: number } = {}
): Raster => {
  const scale = opts.moduleDots ?? 4;
  const quiet = opts.quietModules ?? 4;
  const side = (matrix.size + quiet * 2) * scale;
  const grey = new Uint8Array(side * side).fill(255);

  for (let my = 0; my < matrix.size; my++) {
    for (let mx = 0; mx < matrix.size; mx++) {
      if (!matrix.get(mx, my)) continue;
      const x0 = (mx + quiet) * scale;
      const y0 = (my + quiet) * scale;
      for (let dy = 0; dy < scale; dy++) {
        const row = (y0 + dy) * side;
        for (let dx = 0; dx < scale; dx++) grey[row + x0 + dx] = 0;
      }
    }
  }

  return packMonochrome(grey, side, side);
};

/** Largest module size whose finished code still fits the paper. */
export const qrModuleDotsToFit = (
  modules: number,
  widthDots = PAPER_DOTS,
  quietModules = 4
): number => Math.max(1, Math.floor(widthDots / (modules + quietModules * 2)));

/**
 * Spread each pixel's rounding error into its neighbours, so a smooth gradient
 * becomes a believable pattern of dots rather than a hard edge. Mutates `grey`.
 */
export const ditherFloydSteinberg = (
  grey: Uint8Array,
  width: number,
  height: number,
  threshold = 128
): void => {
  const spread = (x: number, y: number, err: number, factor: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const i = y * width + x;
    grey[i] = Math.max(0, Math.min(255, grey[i] + err * factor));
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = grey[i];
      const next = old < threshold ? 0 : 255;
      grey[i] = next;
      const err = old - next;
      spread(x + 1, y, err, 7 / 16);
      spread(x - 1, y + 1, err, 3 / 16);
      spread(x, y + 1, err, 5 / 16);
      spread(x + 1, y + 1, err, 1 / 16);
    }
  }
};

/** Centre-align, then reset, around a raster block. */
export const centeredRaster = (raster: Raster): number[] => [
  ESC,
  0x61,
  0x01,
  ...rasterToEscPos(raster),
  ESC,
  0x61,
  0x00,
];
