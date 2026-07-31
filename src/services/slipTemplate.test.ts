import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SLIP_TEMPLATE,
  brandWouldBeEmpty,
  normaliseTemplate,
  showsBrandText,
  showsLogo,
  type SlipTemplate,
} from './slipTemplate';

const logo = { bits: 'AAAA', widthDots: 384, heightDots: 40 };
const make = (over: Partial<SlipTemplate> = {}): SlipTemplate => ({
  ...DEFAULT_SLIP_TEMPLATE,
  ...over,
});

describe('defaults', () => {
  // The point of defaulting to text: a Devanagari name prints on day one
  // without anyone having to prepare an image first.
  it('print the name as text, needing no logo', () => {
    expect(DEFAULT_SLIP_TEMPLATE.brandMode).toBe('text');
    expect(DEFAULT_SLIP_TEMPLATE.logo).toBeNull();
    expect(showsBrandText(DEFAULT_SLIP_TEMPLATE)).toBe(true);
    expect(brandWouldBeEmpty(DEFAULT_SLIP_TEMPLATE)).toBe(false);
  });
});

describe('brand mode', () => {
  it('text mode prints the name and not the logo', () => {
    const t = make({ brandMode: 'text', logo });
    expect(showsBrandText(t)).toBe(true);
    expect(showsLogo(t)).toBe(false);
  });

  it('logo mode prints the logo and not the name', () => {
    const t = make({ brandMode: 'logo', logo });
    expect(showsBrandText(t)).toBe(false);
    expect(showsLogo(t)).toBe(true);
  });

  it('both mode prints both', () => {
    const t = make({ brandMode: 'both', logo });
    expect(showsBrandText(t)).toBe(true);
    expect(showsLogo(t)).toBe(true);
  });

  it('none mode prints neither, even with both available', () => {
    const t = make({ brandMode: 'none', logo });
    expect(showsBrandText(t)).toBe(false);
    expect(showsLogo(t)).toBe(false);
  });

  // Choosing a logo mode is not the same as having uploaded one.
  it('does not claim to print a logo that was never uploaded', () => {
    expect(showsLogo(make({ brandMode: 'logo', logo: null }))).toBe(false);
    expect(showsLogo(make({ brandMode: 'both', logo: null }))).toBe(false);
  });

  it('treats a blank name as nothing to print', () => {
    expect(showsBrandText(make({ businessName: '   ' }))).toBe(false);
  });
});

describe('warning about an empty brand', () => {
  it('flags a logo mode with no logo', () => {
    expect(brandWouldBeEmpty(make({ brandMode: 'logo', logo: null }))).toBe(true);
  });

  it('flags a text mode with no name', () => {
    expect(brandWouldBeEmpty(make({ brandMode: 'text', businessName: '' }))).toBe(true);
  });

  it('does not flag both mode when at least the name will print', () => {
    expect(brandWouldBeEmpty(make({ brandMode: 'both', logo: null }))).toBe(false);
  });

  // Deliberately blank is not a mistake.
  it('does not flag none mode', () => {
    expect(brandWouldBeEmpty(make({ brandMode: 'none', businessName: '', logo: null }))).toBe(false);
  });
});

describe('reading a stored template', () => {
  it('falls back to defaults when nothing is saved', () => {
    expect(normaliseTemplate(null)).toEqual(DEFAULT_SLIP_TEMPLATE);
    expect(normaliseTemplate(undefined)).toEqual(DEFAULT_SLIP_TEMPLATE);
  });

  // A settings row outlives the shape it was written with.
  it('fills in fields a older saved template never had', () => {
    const old = { businessName: 'Maharani Farm' } as Partial<SlipTemplate>;
    const t = normaliseTemplate(old);
    expect(t.businessName).toBe('Maharani Farm');
    expect(t.footerMessage).toBe(DEFAULT_SLIP_TEMPLATE.footerMessage);
    expect(t.qr.enabled).toBe(false);
  });

  it('keeps what was saved, including deliberately empty strings', () => {
    const t = normaliseTemplate({ tagline: '', contactLine: '' });
    expect(t.tagline).toBe('');
    expect(t.contactLine).toBe('');
  });

  it('ignores a brand mode it does not recognise', () => {
    const t = normaliseTemplate({ brandMode: 'sideways' as any });
    expect(t.brandMode).toBe(DEFAULT_SLIP_TEMPLATE.brandMode);
  });
});
