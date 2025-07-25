import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BulkFarmerUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedFarmer {
  farmer_code: string;
  name: string;
  phone_number: string;
  row: number;
  errors: string[];
  isValid: boolean;
}

export const BulkFarmerUpload: React.FC<BulkFarmerUploadProps> = ({
  open,
  onOpenChange
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedFarmer[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (farmers: ParsedFarmer[]) => {
      const validFarmers = farmers.filter(f => f.isValid);
      const farmerData = validFarmers.map(f => ({
        farmer_code: f.farmer_code,
        name: f.name,
        phone_number: f.phone_number,
        is_active: true
      }));

      const { data, error } = await supabase
        .from('farmers')
        .insert(farmerData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      toast({ 
        title: `Successfully uploaded ${data.length} farmers!`,
        description: "All valid farmer records have been added to the system."
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const parseCSV = (csvText: string): ParsedFarmer[] => {
    const lines = csvText.trim().split('\n');
    const results: ParsedFarmer[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
      const [farmer_code, name, phone_number] = columns;
      
      const errors: string[] = [];
      
      // Validation
      if (!farmer_code) errors.push('Farmer code is required');
      if (!name) errors.push('Name is required');
      else if (!/^\d{10}$/.test(phone_number)) errors.push('Phone number must be exactly 10 digits');
      
      results.push({
        farmer_code: farmer_code || '',
        name: name || '',
        phone_number: phone_number || '',
        row: i + 1,
        errors,
        isValid: errors.length === 0
      });
    }
    
    return results;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload a CSV file.",
        variant: "destructive" 
      });
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsed = parseCSV(csvText);
      setParsedData(parsed);
      setStep('preview');
    };
    reader.readAsText(selectedFile);
  };

  const downloadTemplate = () => {
    const csvContent = 'farmer_code,name,phone_number\nF001,John Doe,1234567890\nF002,Jane Smith,0987654321';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'farmers_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = () => {
    setStep('processing');
    uploadMutation.mutate(parsedData);
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setStep('upload');
    onOpenChange(false);
  };

  const validCount = parsedData.filter(f => f.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Farmer Upload
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV file with farmer information. The file should contain three columns: farmer_code, name, and phone_number.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <span className="text-sm text-muted-foreground">
                  Use this template to format your data correctly
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• First row should be headers: farmer_code,name,phone_number</li>
                <li>• Farmer code should be unique (e.g., F001, F002)</li>
                <li>• Phone number is optional, but must be exactly 10 digits if provided</li>
                <li>• No empty required fields</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Preview Upload Data</h3>
                <p className="text-sm text-muted-foreground">
                  Review the parsed data before uploading
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} Invalid
                  </Badge>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Farmer Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((farmer, index) => (
                    <TableRow key={index} className={farmer.isValid ? '' : 'bg-red-50'}>
                      <TableCell>{farmer.row}</TableCell>
                      <TableCell>{farmer.farmer_code}</TableCell>
                      <TableCell>{farmer.name}</TableCell>
                      <TableCell>{farmer.phone_number}</TableCell>
                      <TableCell>
                        {farmer.isValid ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <div>
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                            <div className="text-xs text-red-600 mt-1">
                              {farmer.errors.map((error, i) => (
                                <div key={i}>• {error}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back to Upload
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={validCount === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Upload {validCount} Valid Farmers
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-4 text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <h3 className="font-medium">Uploading Farmers...</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we process your data
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
