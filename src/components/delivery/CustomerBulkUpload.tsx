
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/hooks/useCustomers';

interface CustomerBulkUploadProps {
  onUploadComplete: () => void;
}

export const CustomerBulkUpload: React.FC<CustomerBulkUploadProps> = ({
  onUploadComplete
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { customerMutation, generateCustomerCode } = useCustomers();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      const fileName = selectedFile.name.toLowerCase();
      
      if (fileType === 'text/csv' || fileName.endsWith('.csv') || 
          fileType.includes('spreadsheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or Excel file",
          variant: "destructive"
        });
      }
    }
  };

  const parseCSV = (text: string): Array<{name: string, phone: string, address: string}> => {
    const lines = text.split('\n').filter(line => line.trim());
    const customers: Array<{name: string, phone: string, address: string}> = [];
    
    // Skip header row if it exists
    const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle both comma and tab separated values
      const values = line.split(/[,\t]/).map(val => val.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= 3) {
        customers.push({
          name: values[0],
          phone: values[1],
          address: values[2]
        });
      }
    }
    
    return customers;
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
      const customers = parseCSV(text);

      if (customers.length === 0) {
        toast({
          title: "No valid data found",
          description: "Please check your file format. Expected: Name, Phone, Address",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Process customers one by one
      let successCount = 0;
      let errorCount = 0;

      for (const customer of customers) {
        if (!customer.name || !customer.phone) {
          errorCount++;
          continue;
        }

        try {
          const customerData = {
            customer_code: generateCustomerCode(),
            name: customer.name,
            phone_number: customer.phone,
            address: customer.address || '',
            rate_per_liter: 50, // Default rate
            is_active: true
          };

          await new Promise((resolve, reject) => {
            customerMutation.mutate(
              { customerData, isUpdate: false },
              {
                onSuccess: () => {
                  successCount++;
                  resolve(true);
                },
                onError: (error) => {
                  console.error('Error adding customer:', error);
                  errorCount++;
                  reject(error);
                }
              }
            );
          });
        } catch (error) {
          errorCount++;
        }
      }

      toast({
        title: "Bulk upload completed",
        description: `Successfully added ${successCount} customers. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (successCount > 0) {
        onUploadComplete();
        setIsDialogOpen(false);
        setFile(null);
      }

    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Error processing file. Please check the format.",
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
          <div className="text-sm text-gray-600">
            <p>Upload a CSV or Excel file with columns:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Name (required)</li>
              <li>Phone (required)</li>
              <li>Address</li>
            </ul>
          </div>

          <div>
            <Label htmlFor="file-upload">Select File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <FileSpreadsheet className="h-4 w-4" />
              {file.name}
            </div>
          )}

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
