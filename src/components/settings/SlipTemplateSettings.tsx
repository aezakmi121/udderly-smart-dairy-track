import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, X } from 'lucide-react';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_SLIP_TEMPLATE,
  SLIP_TEMPLATE_KEY,
  brandWouldBeEmpty,
  encodeLogoBits,
  normaliseTemplate,
  showsBrandText,
  showsLogo,
  type BrandMode,
  type SlipTemplate,
} from '@/services/slipTemplate';
import {
  PAPER_DOTS,
  needsRaster,
  renderImageRaster,
  renderTextRaster,
  type Raster,
} from '@/services/rasterPrinting';
import { getSlipPreview, type CollectionSlipData } from '@/services/thermalPrinting';

const BRAND_MODES: Array<{ value: BrandMode; label: string; hint: string }> = [
  { value: 'text', label: 'Name only', hint: 'Prints the name as text. No image needed.' },
  { value: 'logo', label: 'Logo only', hint: 'Prints the uploaded image instead of the name.' },
  { value: 'both', label: 'Logo + name', hint: 'Image on top, name underneath.' },
  { value: 'none', label: 'Neither', hint: 'A plain slip with no branding.' },
];

// A representative slip, so the preview shows realistic spacing.
const SAMPLE: CollectionSlipData = {
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
  rateEffectiveFrom: '2026-08-01',
  rateEffectiveSession: 'morning',
};

/** Draw a raster onto a canvas at 1:1, so the preview is the real thing. */
const RasterPreview: React.FC<{ raster: Raster | null; label: string }> = ({ raster, label }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !raster) return;
    canvas.width = raster.width;
    canvas.height = raster.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(raster.width, raster.height);
    const rowBytes = Math.ceil(raster.width / 8);
    for (let y = 0; y < raster.height; y++) {
      for (let x = 0; x < raster.width; x++) {
        const on = (raster.bits[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
        const p = (y * raster.width + x) * 4;
        const v = on ? 0 : 255;
        img.data[p] = v;
        img.data[p + 1] = v;
        img.data[p + 2] = v;
        img.data[p + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [raster]);

  if (!raster) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <canvas ref={ref} className="border bg-white max-w-full" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};

export const SlipTemplateSettings: React.FC = () => {
  const { value: stored, save, isLoading } = useAppSetting<SlipTemplate>(SLIP_TEMPLATE_KEY);
  const { toast } = useToast();
  const [form, setForm] = useState<SlipTemplate>(DEFAULT_SLIP_TEMPLATE);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    setForm(normaliseTemplate(stored));
  }, [stored]);

  const set = <K extends keyof SlipTemplate>(key: K, value: SlipTemplate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Render exactly what the printer will receive, so a missing Devanagari font
  // shows up here rather than on wasted paper.
  const brandRaster = useMemo(() => {
    setRenderError(null);
    if (!showsBrandText(form)) return null;
    try {
      return renderTextRaster(form.businessName, { bold: true, fontSizePx: 30 });
    } catch (e: any) {
      setRenderError(e.message);
      return null;
    }
  }, [form.businessName, form.brandMode]);

  const footerRaster = useMemo(() => {
    if (!form.footerMessage.trim() || !needsRaster(form.footerMessage)) return null;
    try {
      return renderTextRaster(form.footerMessage, { fontSizePx: 24 });
    } catch {
      return null;
    }
  }, [form.footerMessage]);

  const handleLogoUpload = async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('That file could not be read as an image'));
        img.src = url;
      });
      // Reduce once here, so printing never does image work.
      const raster = renderImageRaster(img, { widthDots: PAPER_DOTS, maxHeightDots: 160 });
      URL.revokeObjectURL(url);
      set('logo', {
        bits: encodeLogoBits(raster.bits),
        widthDots: raster.width,
        heightDots: raster.height,
      });
      if (form.brandMode === 'text') set('brandMode', 'both');
      toast({ title: 'Logo ready', description: `Converted to ${raster.width}x${raster.height} dots.` });
    } catch (e: any) {
      toast({ title: 'Could not use that image', description: e.message, variant: 'destructive' });
    }
  };

  const preview = getSlipPreview(SAMPLE, form);
  const emptyBrand = brandWouldBeEmpty(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slip Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          What the slip says around the figures. Hindi is supported everywhere here — those lines are
          printed as an image, because thermal printers have no Devanagari built in.
        </p>

        <div>
          <Label className="mb-2 block">Branding</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {BRAND_MODES.map((m) => (
              <Button
                key={m.value}
                type="button"
                size="sm"
                variant={form.brandMode === m.value ? 'default' : 'outline'}
                onClick={() => set('brandMode', m.value)}
              >
                {m.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {BRAND_MODES.find((m) => m.value === form.brandMode)?.hint}
          </p>
        </div>

        {emptyBrand && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {form.brandMode === 'logo' || form.brandMode === 'both'
                ? 'No logo uploaded yet, so nothing would print at the top of the slip.'
                : 'The business name is empty, so nothing would print at the top of the slip.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={form.businessName}
              onChange={(e) => set('businessName', e.target.value)}
              placeholder="श्रीLalita By Maharani Farm"
            />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="Collection Slip"
            />
          </div>
          <div>
            <Label htmlFor="footer">Footer message</Label>
            <Input
              id="footer"
              value={form.footerMessage}
              onChange={(e) => set('footerMessage', e.target.value)}
              placeholder="धन्यवाद!"
            />
          </div>
          <div>
            <Label htmlFor="contact">Contact line</Label>
            <Input
              id="contact"
              value={form.contactLine}
              onChange={(e) => set('contactLine', e.target.value)}
              placeholder="Ph: 98765 43210"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Logo</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {form.logo ? 'Replace image' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                  }}
                />
              </label>
            </Button>
            {form.logo && (
              <Button type="button" variant="outline" size="sm" onClick={() => set('logo', null)}>
                <X className="h-4 w-4 mr-2" /> Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Converted to black and white at {PAPER_DOTS} dots wide when you upload it. Simple, high
            contrast artwork prints best; photographs turn muddy.
          </p>
        </div>

        {renderError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{renderError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label>Exactly what will print</Label>
          {showsLogo(form) && (
            <p className="text-xs text-muted-foreground">
              Logo: {form.logo?.widthDots}x{form.logo?.heightDots} dots
            </p>
          )}
          <RasterPreview raster={brandRaster} label="Business name, as the printer will draw it" />
          <RasterPreview raster={footerRaster} label="Footer message" />
          <Card className="bg-muted/50 p-3">
            <pre className="text-xs font-mono whitespace-pre overflow-x-auto">{preview}</pre>
          </Card>
          <p className="text-xs text-muted-foreground">
            The picture panels above are the real output. If a line shows boxes or blanks instead of
            Hindi, this device has no font for it — check on the device you print from.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save(form)} disabled={isLoading}>
            Save
          </Button>
          <Button variant="outline" onClick={() => setForm(DEFAULT_SLIP_TEMPLATE)}>
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
