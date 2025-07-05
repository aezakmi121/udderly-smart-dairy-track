
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/hooks/useCustomers';
import { BulkUploadProps } from './bulk-upload/types';
import { CSVParser } from './bulk-upload/csvParser';
import { FileSelector } from './bulk-upload/FileSelector';
import { UploadInstructions } from './bulk-upload/UploadInstructions';
import { CustomerProcessor } from './bulk-upload/CustomerProcessor';

export const CustomerBulkUpload: React.FC<BulkUploadProps> = ({
  onUploadComplete
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { customerMutation, generateCustomerCode } = useCustomers();

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && !CSVParser.validateFile(selectedFile)) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV or Excel file",
        variant: "destructive"
      });
      return;
    }
    setFile(selectedFile);
    if (selectedFile) {
      console.log('File selected:', selectedFile.name, 'Type:', selectedFile.type);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const text = await file.text();
      console.log('File content preview:', text.substring(0, 200));
      
      const customers = CSVParser.parse(text);

      if (customers.length === 0) {
        toast({
          title: "No valid data found",
          description: "Please check your file format. Expected: Name, Phone, Address (tab or comma separated)",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      console.log('Processing', customers.length, 'customers');

      const processor = new CustomerProcessor(customerMutation, generateCustomerCode);
      const { successCount, errorCount, errors } = await processor.processCustomers(customers);

      // Show detailed results
      if (successCount > 0) {
        toast({
          title: "Bulk upload completed",
          description: `Successfully added ${successCount} customers${errorCount > 0 ? `. ${errorCount} failed.` : '.'}`,
          variant: "default"
        });
      }

      if (errorCount > 0) {
        console.error('Upload errors:', errors);
        toast({
          title: "Some uploads failed",
          description: `${errorCount} customers failed to upload. Check console for details.`,
          variant: "destructive"
        });
      }

      if (successCount > 0) {
        onUploadComplete();
        setIsDialogOpen(false);
        setFile(null);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({
        title: "Upload failed",
        description: `Error processing file: ${errorMessage}`,
        variant: "destructive"
      });
    }

    setIsProcessing(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Upload Customers</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <UploadInstructions />
          
          <FileSelector
            file={file}
            onFileChange={handleFileChange}
            isDisabled={isProcessing}
          />

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!file || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
