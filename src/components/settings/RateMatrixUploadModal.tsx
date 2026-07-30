import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RateMatrixViewer } from './RateMatrixViewer';

interface RateMatrixUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadResult {
  species: string;
  snf_count: number;
  fat_count: number;
  rows_upserted: number;
}

interface UploadCheck {
  species: string;
  priced_cells: number;
  unpriced_cells: number;
  payable_fat_min: number | null;
  payable_fat_max: number | null;
  payable_snf_min: number | null;
  payable_snf_max: number | null;
  rate_min: number | null;
  rate_max: number | null;
  reversals?: Array<{ axis: string; fat: number; snf: number; rate: number; prevRate: number }>;
  reversal_count?: number;
}

interface RateChangeImpact {
  affected_collections: number;
  affected_amount: number;
  first_date: string | null;
  last_date: string | null;
  finalized_cycles: number;
}

export const RateMatrixUploadModal: React.FC<RateMatrixUploadModalProps> = ({
  open,
  onOpenChange
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveSession, setEffectiveSession] = useState<'morning' | 'evening'>('morning');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'upserting' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<UploadResult[]>([]);
  const [checks, setChecks] = useState<UploadCheck[]>([]);
  const [overlapCount, setOverlapCount] = useState(0);
  const [error, setError] = useState<string>('');
  const [showViewer, setShowViewer] = useState(false);
  const [impact, setImpact] = useState<RateChangeImpact | null>(null);
  const [checkingImpact, setCheckingImpact] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // A list dated in the past does not rewrite what has already been recorded --
  // collections keep their stored amounts, and payouts and bills read those
  // rather than re-pricing. What it does change is anything entered or edited
  // into that window afterwards, which would then price differently from its
  // neighbours. Worth confirming deliberately rather than discovering later.
  const isBackdated = (() => {
    const today = new Date().toISOString().split('T')[0];
    if (effectiveFrom > today) return false;
    if (effectiveFrom < today) return true;
    // Same day: only the evening slot is still ahead of a morning collection.
    return effectiveSession === 'morning' || new Date().getHours() >= 12;
  })();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
        setError('Please select an Excel (.xlsx) file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  // Step one for a backdated list: show what it would affect and wait for an
  // explicit confirmation. Never writes anything.
  const handleRequestUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    if (!isBackdated) {
      await handleUpload();
      return;
    }

    setCheckingImpact(true);
    setError('');
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('fn_rate_change_impact', {
        p_date: effectiveFrom,
        p_session: effectiveSession,
      });
      if (rpcError) throw rpcError;
      const row = data?.[0];
      // Nothing in the window means there is nothing to warn about.
      if (!row || Number(row.affected_collections) === 0) {
        await handleUpload();
        return;
      }
      setImpact({
        affected_collections: Number(row.affected_collections),
        affected_amount: Number(row.affected_amount),
        first_date: row.first_date,
        last_date: row.last_date,
        finalized_cycles: Number(row.finalized_cycles),
      });
    } catch (err: any) {
      setError(err.message || 'Could not check what this rate list would affect');
    } finally {
      setCheckingImpact(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setImpact(null);
    setIsUploading(true);
    setError('');
    setResults([]);

    try {
      setUploadStatus('uploading');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('effective_from', effectiveFrom);
      formData.append('effective_session', effectiveSession);

      setUploadStatus('parsing');

      const { data, error: functionError } = await supabase.functions.invoke('upload-rate-matrix', {
        body: formData,
      });

      if (functionError) throw functionError;
      if (!data.success) throw new Error(data.error);

      setUploadStatus('success');
      setResults(data.results);
      setChecks(data.checks ?? []);
      setOverlapCount(data.overlap_count ?? 0);
      
      // Invalidate rate matrix queries to force fresh data
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes('rate');
        }
      });
      
      toast({
        title: "Rate matrix uploaded successfully!",
        description: `Processed ${data.results.length} species with rate data.`
      });

    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      setError(err.message || 'Failed to upload rate matrix');
      toast({
        title: "Upload failed",
        description: err.message || 'Please check your file format and try again.',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setError('');
    setResults([]);
    setChecks([]);
    setOverlapCount(0);
    setImpact(null);
    setUploadStatus('idle');
    setIsUploading(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading': return 'Uploading file...';
      case 'parsing': return 'Parsing Excel data...';
      case 'upserting': return 'Saving to database...';
      case 'success': return 'Upload completed successfully!';
      case 'error': return 'Upload failed';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Rate Matrix (Excel)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-sm space-y-2">
                <p><strong>Required Excel format:</strong></p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Two tabs named exactly: "Buffalo" and "Cow"</li>
                  <li>Row 2: SNF values starting from column B (e.g., B2=8.0, C2=8.5, D2=9.0...)</li>
                  <li>Column A from row 3: Fat values (e.g., A3=3.0, A4=3.5, A5=4.0...)</li>
                  <li>Rate grid starts from B3 (intersection of Fat and SNF)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Upload Form */}
          {uploadStatus === 'idle' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="file">Excel File (.xlsx)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="effective_from">Effective From</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={effectiveSession === 'morning' ? 'default' : 'outline'}
                    onClick={() => setEffectiveSession('morning')}
                  >
                    Morning
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={effectiveSession === 'evening' ? 'default' : 'outline'}
                    onClick={() => setEffectiveSession('evening')}
                  >
                    Evening
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {effectiveSession === 'morning'
                    ? `Applies from the morning session of ${effectiveFrom}.`
                    : `Applies from the evening session of ${effectiveFrom} — that morning still uses the previous list.`}
                </p>
              </div>
            </div>
          )}

          {/* Progress */}
          {uploadStatus !== 'idle' && uploadStatus !== 'success' && (
            <Card className="border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm font-medium">{getStatusText()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Backdated list — confirm before publishing */}
          {impact && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-amber-900">
                      This rate list starts in the past
                    </p>
                    <p className="text-amber-800">
                      There {impact.affected_collections === 1 ? 'is' : 'are'} already{' '}
                      <span className="font-medium">{impact.affected_collections}</span> collection
                      {impact.affected_collections === 1 ? '' : 's'} on or after the{' '}
                      {effectiveSession} session of {effectiveFrom}
                      {impact.first_date && impact.last_date && (
                        <> ({impact.first_date} to {impact.last_date})</>
                      )}
                      , worth{' '}
                      <span className="font-medium">₹{impact.affected_amount.toFixed(2)}</span>.
                    </p>
                    <p className="text-amber-800">
                      Those amounts stay as recorded — bills and payouts use the stored figures and
                      are not re-priced. But anything entered or edited into that window from now on
                      will use this new list, so it may not match its neighbours.
                    </p>
                    {impact.finalized_cycles > 0 && (
                      <p className="font-medium text-red-700">
                        {impact.finalized_cycles} finalised payout cycle
                        {impact.finalized_cycles === 1 ? '' : 's'} overlap this period. Re-entering a
                        collection there would disagree with what was already paid.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => setImpact(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleUpload} disabled={isUploading}>
                    Publish anyway
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Results */}
          {uploadStatus === 'success' && results.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Upload Summary</span>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Species</TableHead>
                      <TableHead>SNF Count</TableHead>
                      <TableHead>Fat Count</TableHead>
                      <TableHead>Rows Upserted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.species}>
                        <TableCell>
                          <Badge variant="outline">{result.species}</Badge>
                        </TableCell>
                        <TableCell>{result.snf_count}</TableCell>
                        <TableCell>{result.fat_count}</TableCell>
                        <TableCell className="font-medium">{result.rows_upserted}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 text-xs text-green-700">
                  Applies from the {effectiveSession} session of {effectiveFrom}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sanity checks — what the uploaded list actually says */}
          {uploadStatus === 'success' && checks.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="font-medium text-sm mb-3">Rate list summary</div>
                <div className="space-y-3">
                  {checks.map((c) => (
                    <div key={c.species} className="text-sm border rounded-md p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{c.species}</Badge>
                        {(c.reversal_count ?? 0) > 0 && (
                          <span className="text-xs text-amber-700 font-medium">
                            {c.reversal_count} rate reversal(s)
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div>
                          Priced cells:{' '}
                          <span className="font-medium text-foreground">{c.priced_cells}</span>{' '}
                          ({c.unpriced_cells} unpriced)
                        </div>
                        <div>
                          Rate range:{' '}
                          <span className="font-medium text-foreground">
                            {c.rate_min === null || c.rate_min === undefined ? '—' : `₹${c.rate_min.toFixed(2)}`} – {c.rate_max === null || c.rate_max === undefined ? '—' : `₹${c.rate_max.toFixed(2)}`}
                          </span>
                        </div>
                        <div>
                          Payable fat:{' '}
                          <span className="font-medium text-foreground">
                            {c.payable_fat_min ?? '—'} – {c.payable_fat_max ?? '—'}
                          </span>
                        </div>
                        <div>
                          Payable SNF:{' '}
                          <span className="font-medium text-foreground">
                            {c.payable_snf_min ?? '—'} – {c.payable_snf_max ?? '—'}
                          </span>
                        </div>
                      </div>
                      {(c.reversals?.length ?? 0) > 0 && (
                        <div className="mt-2 text-xs text-amber-700">
                          <div className="font-medium mb-1">
                            Rate drops as {c.reversals?.[0]?.axis === 'fat' ? 'fat' : 'SNF'} rises — check these for a typo:
                          </div>
                          {c.reversals?.map((r, i) => (
                            <div key={i}>
                              fat {r.fat} / SNF {r.snf}: ₹{r.rate.toFixed(2)} is below the previous ₹{r.prevRate.toFixed(2)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {overlapCount > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {overlapCount} fat/SNF combination(s) are priced by both species. Species is
                      derived from whichever matrix prices a sample, so these will be ambiguous.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleClose} size="sm">
                {uploadStatus === 'success' ? 'Close' : 'Cancel'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowViewer(true)}
                size="sm"
                className="whitespace-nowrap"
              >
                <Eye className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View Current Rates</span>
                <span className="sm:hidden">View Rates</span>
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {uploadStatus === 'idle' && (
                <Button 
                  onClick={handleRequestUpload} 
                  disabled={!file || isUploading || checkingImpact}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">
                    {checkingImpact ? 'Checking…' : 'Upload Rate Matrix'}
                  </span>
                  <span className="sm:hidden">{checkingImpact ? 'Checking…' : 'Upload'}</span>
                </Button>
              )}

              {(uploadStatus === 'success' || uploadStatus === 'error') && (
                <Button onClick={resetModal} size="sm" className="whitespace-nowrap">
                  <span className="hidden sm:inline">Upload Another File</span>
                  <span className="sm:hidden">Upload Another</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      
      <RateMatrixViewer 
        open={showViewer} 
        onOpenChange={setShowViewer} 
      />
    </Dialog>
  );
};