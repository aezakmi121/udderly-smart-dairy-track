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

export const RateMatrixUploadModal: React.FC<RateMatrixUploadModalProps> = ({
  open,
  onOpenChange
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'upserting' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

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

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError('');
    setResults([]);

    try {
      setUploadStatus('uploading');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('effective_from', effectiveFrom);

      setUploadStatus('parsing');

      const { data, error: functionError } = await supabase.functions.invoke('upload-rate-matrix', {
        body: formData,
      });

      if (functionError) throw functionError;
      if (!data.success) throw new Error(data.error);

      setUploadStatus('success');
      setResults(data.results);
      
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
                  Rate from version ≤ {effectiveFrom}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClose}>
              {uploadStatus === 'success' ? 'Close' : 'Cancel'}
            </Button>
            
            <div className="flex gap-2">
              {uploadStatus === 'success' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Navigate to rate viewer - placeholder for now
                    toast({ title: "Rate viewer feature coming soon!" });
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Latest Rates
                </Button>
              )}
              
              {uploadStatus === 'idle' && (
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Rate Matrix
                </Button>
              )}

              {(uploadStatus === 'success' || uploadStatus === 'error') && (
                <Button onClick={resetModal}>
                  Upload Another File
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};