import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
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

  const fileToDataUrl = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke('extract-collection-slip', {
        body: {
          image_data_url: dataUrl,
          date_override: date,
          session_override: session,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Extraction failed');
      setResult(data as ExtractionResult);
      if (data.collection_date) setDate(data.collection_date);
      if (data.session === 'morning' || data.session === 'evening') setSession(data.session);
      toast({ title: 'Slip extracted', description: 'Review rows below before saving.' });
    } catch (e: any) {
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
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
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
