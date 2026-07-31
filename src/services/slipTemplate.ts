// What a collection slip says around the figures.
//
// The dairy's name, and anything else a farmer reads rather than checks, lives
// here rather than in the code, so it can be changed without a deploy. The
// brand can be printed as text, as an uploaded logo, as both, or left off
// entirely -- which means a Devanagari farm name works on day one without
// anyone having to prepare an image file first.

export type BrandMode = 'text' | 'logo' | 'both' | 'none';

/** A logo already reduced to printable form, so printing does no image work. */
export interface StoredLogo {
  /** Base64 of the packed 1-bit rows. */
  bits: string;
  widthDots: number;
  heightDots: number;
  /** Fraction of dots that will burn, so the UI can warn about a heavy image. */
  coverage?: number;
  /** Whether black and white were swapped when this was prepared. */
  inverted?: boolean;
}

/** Above this, an image reads as a blot and prints slowly. */
export const HEAVY_COVERAGE = 0.4;

export interface SlipTemplate {
  brandMode: BrandMode;
  businessName: string;
  tagline: string;
  footerMessage: string;
  contactLine: string;
  logo: StoredLogo | null;
  qr: {
    enabled: boolean;
    caption: string;
  };
}

export const SLIP_TEMPLATE_KEY = 'slip_template';

// Defaults print the farm name as text: no logo needed, and nothing here has to
// be filled in before slips look like they come from a business.
export const DEFAULT_SLIP_TEMPLATE: SlipTemplate = {
  brandMode: 'text',
  businessName: 'श्रीLalita By Maharani Farm',
  tagline: 'Collection Slip',
  footerMessage: 'धन्यवाद!',
  contactLine: '',
  logo: null,
  qr: {
    // Turned on in the step that prints the farmer portal link.
    enabled: false,
    caption: 'अपना हिसाब देखें',
  },
};

/**
 * Fill in anything a stored template is missing.
 *
 * Settings rows outlive the shape they were written with, so a template saved
 * before a field existed still has to produce a printable slip.
 */
export const normaliseTemplate = (stored: Partial<SlipTemplate> | null | undefined): SlipTemplate => {
  const t = stored ?? {};
  return {
    brandMode: (['text', 'logo', 'both', 'none'] as const).includes(t.brandMode as BrandMode)
      ? (t.brandMode as BrandMode)
      : DEFAULT_SLIP_TEMPLATE.brandMode,
    businessName: t.businessName ?? DEFAULT_SLIP_TEMPLATE.businessName,
    tagline: t.tagline ?? DEFAULT_SLIP_TEMPLATE.tagline,
    footerMessage: t.footerMessage ?? DEFAULT_SLIP_TEMPLATE.footerMessage,
    contactLine: t.contactLine ?? DEFAULT_SLIP_TEMPLATE.contactLine,
    logo: t.logo ?? null,
    qr: {
      enabled: t.qr?.enabled ?? DEFAULT_SLIP_TEMPLATE.qr.enabled,
      caption: t.qr?.caption ?? DEFAULT_SLIP_TEMPLATE.qr.caption,
    },
  };
};

/** Should the name be printed at all, given the mode and whether a logo exists? */
export const showsBrandText = (t: SlipTemplate): boolean =>
  (t.brandMode === 'text' || t.brandMode === 'both') && t.businessName.trim().length > 0;

/** Asking for a logo is not the same as having one. */
export const showsLogo = (t: SlipTemplate): boolean =>
  (t.brandMode === 'logo' || t.brandMode === 'both') && t.logo !== null;

/**
 * A mode that would print nothing, because the piece it names is missing.
 * Worth telling the user about rather than handing them a headerless slip.
 */
export const brandWouldBeEmpty = (t: SlipTemplate): boolean =>
  t.brandMode !== 'none' && !showsBrandText(t) && !showsLogo(t);

export const encodeLogoBits = (bits: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bits.length; i++) binary += String.fromCharCode(bits[i]);
  return btoa(binary);
};

export const decodeLogoBits = (encoded: string): Uint8Array => {
  const binary = atob(encoded);
  const bits = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bits[i] = binary.charCodeAt(i);
  return bits;
};
