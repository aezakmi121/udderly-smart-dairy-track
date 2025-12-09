import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  isWebBluetoothSupported,
  printCollectionSlip,
  getSlipPreview,
  getSavedPrinter,
  CollectionSlipData,
} from '@/services/thermalPrinting';

interface PrintSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    farmer_id: string;
    farmers?: { name: string; farmer_code: string } | null;
    collection_date: string;
    session: 'morning' | 'evening';
    quantity: number;
    fat_percentage: number;
    snf_percentage: number;
    rate_per_liter: number;
    total_amount: number;
    species: string;
  } | null;
}

export const PrintSlipDialog: React.FC<PrintSlipDialogProps> = ({
  open,
  onOpenChange,
  collection,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const isSupported = isWebBluetoothSupported();
  const savedPrinter = getSavedPrinter();

  if (!collection) return null;

  const slipData: CollectionSlipData = {
    farmerName: collection.farmers?.name || 'Unknown Farmer',
    farmerCode: collection.farmers?.farmer_code || 'N/A',
    date: collection.collection_date,
    session: collection.session,
    quantity: collection.quantity,
    fatPercentage: collection.fat_percentage,
    snfPercentage: collection.snf_percentage,
    ratePerLiter: collection.rate_per_liter,
    totalAmount: collection.total_amount,
    species: collection.species,
  };

  const previewText = getSlipPreview(slipData);

  const handlePrint = async () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Web Bluetooth is not supported in this browser. Use Chrome on Android or desktop.',
        variant: 'destructive',
      });
      return;
    }

    if (!savedPrinter) {
      toast({
        title: 'No Printer Configured',
        description: 'Please select a printer in Settings → Printer Settings.',
        variant: 'destructive',
      });
      return;
    }

    setIsPrinting(true);
    try {
      await printCollectionSlip(slipData);
      toast({
        title: 'Print Successful',
        description: 'Collection slip printed successfully!',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Print Failed',
        description: error.message || 'Failed to print the slip. Please check printer connection.',
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Collection Slip
          </DialogTitle>
        </DialogHeader>

        {/* Printer Status */}
        <div className="text-sm">
          {isSupported ? (
            savedPrinter ? (
              <p className="text-muted-foreground">
                Printer: <span className="font-medium text-foreground">{savedPrinter.name}</span>
              </p>
            ) : (
              <p className="text-destructive">
                No printer configured. Go to Settings → Printer Settings.
              </p>
            )
          ) : (
            <p className="text-muted-foreground">
              Web Bluetooth not supported. Use Chrome on Android or desktop.
            </p>
          )}
        </div>

        {/* Slip Preview */}
        <Card className="bg-muted/50 p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
            {previewText}
          </pre>
        </Card>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting || !isSupported || !savedPrinter}
          >
            <Printer className={`h-4 w-4 mr-2 ${isPrinting ? 'animate-pulse' : ''}`} />
            {isPrinting ? 'Printing...' : 'Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
