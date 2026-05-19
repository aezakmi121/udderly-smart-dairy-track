import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, AlertTriangle, Camera, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ExtractedRow {
  code: string;
  farmer_id: string | null;
  farmer_name: string | null;
  qty: number;
  fat: number;
  snf: number;
  rate: number;
  rate_source: 'matrix' | 'clamped_high' | 'clamped_low' | 'none';
  computed_amount: number;
  printed_amount: number;
  discrepancy: boolean;
}

interface ExtractedSection {
  species: 'Cow' | 'Buffalo';
  rows: ExtractedRow[];
}

interface ExtractionResult {
  collection_date: string;
  session: 'morning' | 'evening' | 'all';
  mpp_code: string | null;
  sections: ExtractedSection[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
  defaultSession: 'morning' | 'evening';
}

export const SlipScanModal: React.FC<Props> = ({ open, onOpenChange, defaultDate, defaultSession }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [session, setSession] = useState<'morning' | 'evening'>(defaultSession);

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setResult(null);
      setDate(defaultDate);
      setSession(defaultSession);
    }
  }, [open, defaultDate, defaultSession]);

  // Downscale + JPEG-compress so we stay well under the 6MB Edge Function body limit.
  // Higher res + quality than before: small slip digits (0 vs 8) need the detail.
  const fileToCompressedDataUrl = (f: File, maxEdge = 2400, quality = 0.92): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return rej(new Error('canvas ctx unavailable'));
          ctx.drawImage(img, 0, 0, w, h);
          res(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = rej;
        img.src = reader.result as string;
      };
      reader.onerror = rej;
      reader.readAsDataURL(f);
    });

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      console.log('slip-scan: payload kb', Math.round(dataUrl.length / 1024));
      const { data, error } = await supabase.functions.invoke('extract-collection-slip', {
        body: {
          image_data_url: dataUrl,
          date_override: date,
          session_override: session,
        },
      });
      if (error) {
        // supabase.functions.invoke wraps non-2xx as FunctionsHttpError; the real
        // JSON body (error + detail) lives on error.context (a Response).
        let msg = error.message || 'Extraction failed';
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            msg = [body?.error, body?.detail].filter(Boolean).join(' — ') || msg;
          } catch {
            /* keep generic message */
          }
        }
        throw new Error(msg);
      }
      if (!data?.success) throw new Error(data?.error || 'Extraction failed');
      setResult(data as ExtractionResult);
      if (data.collection_date) setDate(data.collection_date);
      if (data.session === 'morning' || data.session === 'evening') setSession(data.session);
      toast({ title: 'Slip extracted', description: 'Review rows below before saving.' });
    } catch (e: any) {
      console.error('slip-scan error', e);
      toast({
        title: 'Extraction failed',
        description: e?.message || 'Could not parse slip.',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  const updateRow = (sIdx: number, rIdx: number, patch: Partial<ExtractedRow>) => {
    if (!result) return;
    const next = { ...result, sections: result.sections.map((s, i) => i !== sIdx ? s : {
      ...s,
      rows: s.rows.map((r, j) => j !== rIdx ? r : { ...r, ...patch }),
    }) };
    setResult(next);
  };

  const totals = React.useMemo(() => {
    if (!result) return { qty: 0, amount: 0, count: 0, missing: 0 };
    let qty = 0, amount = 0, count = 0, missing = 0;
    for (const s of result.sections) for (const r of s.rows) {
      qty += Number(r.qty) || 0;
      amount += Number(r.computed_amount) || 0;
      count += 1;
      if (!r.farmer_id) missing += 1;
    }
    return { qty, amount, count, missing };
  }, [result]);

  const handleSave = async () => {
    if (!result) return;
    if (totals.missing > 0) {
      toast({
        title: 'Unmapped farmer codes',
        description: `${totals.missing} row(s) have no matching farmer. Fix or remove them first.`,
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const rows = [];
      for (const s of result.sections) {
        for (const r of s.rows) {
          rows.push({
            farmer_id: r.farmer_id,
            collection_date: date,
            session,
            species: s.species,
            quantity: Number(r.qty),
            fat_percentage: Number(r.fat),
            snf_percentage: Number(r.snf),
            rate_per_liter: Number(r.rate),
            total_amount: Number(r.computed_amount),
            is_accepted: true,
            remarks: r.rate_source !== 'matrix' ? `slip-scan: ${r.rate_source}` : 'slip-scan',
          });
        }
      }
      const { error } = await supabase.from('milk_collections').insert(rows);
      if (error) throw error;
      toast({ title: 'Saved', description: `${rows.length} collections recorded.` });
      qc.invalidateQueries({ queryKey: ['milk-collections'] });
      qc.invalidateQueries({ queryKey: ['daily-collection-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] });

      // Fire-and-forget: push a collection summary to staff. A failure here
      // must not affect the (already successful) save.
      void supabase.functions
        .invoke('notify-collection-summary', {
          body: {
            collection_date: date,
            session,
            total_quantity: totals.qty,
            total_amount: totals.amount,
            farmer_count: totals.count,
            source: 'slip-scan',
          },
        })
        .catch((err) => console.warn('collection summary notification failed', err));

      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || 'Could not insert collections.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const sourceBadge = (s: ExtractedRow['rate_source']) => {
    if (s === 'matrix') return null;
    if (s === 'clamped_high') return <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">⚠ high</Badge>;
    if (s === 'clamped_low') return <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">⚠ low</Badge>;
    return <Badge variant="destructive" className="text-[10px]">no rate</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Collection Slip</DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Session</Label>
                <Select value={session} onValueChange={(v) => setSession(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Slip Photo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => document.getElementById('slip-camera-input')?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" /> Take Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => document.getElementById('slip-gallery-input')?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" /> From Gallery
                  </Button>
                </div>
                <input
                  id="slip-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <input
                  id="slip-gallery-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            {file && (
              <div className="flex items-center gap-3 p-2 border rounded">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Slip preview"
                  className="h-20 w-20 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The AI will read the slip and compute amounts using the rate matrix (with clamping for out-of-range fat/SNF).
              Review every row before saving.
            </p>
            <Button onClick={handleExtract} disabled={!file || extracting} className="w-full md:w-auto">
              {extracting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting…</> : <><Upload className="h-4 w-4 mr-2" /> Extract Slip</>}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-muted/50 p-3 rounded">
              <div><span className="text-muted-foreground">Date:</span> {date}</div>
              <div><span className="text-muted-foreground">Session:</span> {session}</div>
              <div><span className="text-muted-foreground">Rows:</span> {totals.count}</div>
              <div><span className="text-muted-foreground">Total:</span> ₹{totals.amount.toFixed(2)} ({totals.qty.toFixed(2)} L)</div>
            </div>

            {totals.missing > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                {totals.missing} row(s) have unmatched farmer codes. Edit the code or remove the row before saving.
              </div>
            )}

            {result.sections.map((sec, sIdx) => (
              <div key={sIdx} className="border rounded">
                <div className="bg-muted px-3 py-2 font-medium text-sm">{sec.species} ({sec.rows.length} rows)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-left">Farmer</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Fat</th>
                        <th className="p-2 text-right">SNF</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Computed ₹</th>
                        <th className="p-2 text-right">Printed ₹</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.rows.map((r, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            !r.farmer_id
                              ? 'bg-destructive/10'
                              : r.discrepancy
                              ? 'bg-amber-50 dark:bg-amber-950/20'
                              : ''
                          }
                        >
                          <td className="p-2">
                            <Input
                              className="h-7 text-xs w-20"
                              value={r.code}
                              onChange={(e) => updateRow(sIdx, rIdx, { code: e.target.value })}
                            />
                          </td>
                          <td className="p-2 text-xs">
                            {r.farmer_name ?? <span className="text-destructive">unmatched</span>}
                          </td>
                          <td className="p-2 text-right">{r.qty.toFixed(2)}</td>
                          <td className="p-2 text-right">{r.fat.toFixed(1)}</td>
                          <td className="p-2 text-right">{r.snf.toFixed(1)}</td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              ₹{Number(r.rate).toFixed(2)}
                              {sourceBadge(r.rate_source)}
                            </div>
                          </td>
                          <td className="p-2 text-right font-medium">₹{r.computed_amount.toFixed(2)}</td>
                          <td className="p-2 text-right text-muted-foreground">
                            ₹{r.printed_amount.toFixed(2)}
                            {r.discrepancy && <span className="ml-1 text-amber-600">⚠</span>}
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const next = { ...result };
                                next.sections[sIdx].rows.splice(rIdx, 1);
                                setResult({ ...next });
                              }}
                            >×</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          {result && (
            <>
              <Button variant="outline" onClick={() => setResult(null)} disabled={saving}>Re-scan</Button>
              <Button onClick={handleSave} disabled={saving || totals.count === 0}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : `Save ${totals.count} rows`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
