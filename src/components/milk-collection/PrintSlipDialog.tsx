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
import { useAppSetting } from '@/hooks/useAppSettings';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  SLIP_TEMPLATE_KEY,
  normaliseTemplate,
  type SlipTemplate,
} from '@/services/slipTemplate';
import {
  isWebBluetoothSupported,
  printCollectionSlip,
  getSlipPreview,
  getSavedPrinter,
  getPrintMethod,
  isAndroid,
  CollectionSlipData,
} from '@/services/thermalPrinting';

interface PrintSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    farmer_id: string;
    collection_date: string;
    session: 'morning' | 'evening';
    quantity: number;
    fat_percentage: number;
    snf_percentage: number;
    rate_per_liter: number;
    total_amount: number;
    species: string;
    rate_effective_from?: string | null;
    rate_effective_session?: string | null;
    farmers?: { name: string; farmer_code: string; portal_token?: string | null } | null;
  } | null;
}

export const PrintSlipDialog: React.FC<PrintSlipDialogProps> = ({
  open,
  onOpenChange,
  collection,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { value: storedTemplate } = useAppSetting<SlipTemplate>(SLIP_TEMPLATE_KEY);
  const template = normaliseTemplate(storedTemplate);

  const method = getPrintMethod();
  const onAndroid = isAndroid();
  const isWBSupported = isWebBluetoothSupported();
  const savedPrinter = getSavedPrinter();

  const canPrint = method === 'rawbt' ? onAndroid : (isWBSupported && !!savedPrinter);

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
    rateEffectiveFrom: collection.rate_effective_from ?? null,
    rateEffectiveSession: collection.rate_effective_session ?? null,
    // Short path keeps the QR coarse enough to scan off thermal paper.
    portalUrl: collection.farmers?.portal_token
      ? `${window.location.origin}/f/${collection.farmers.portal_token}`
      : null,
  };

  const previewText = getSlipPreview(slipData, template);

  const handlePrint = async () => {
    if (!canPrint) {
      if (method === 'rawbt' && !onAndroid) {
        toast({
          title: 'Not Supported',
          description: 'RawBT only works on Android. Switch print method in Settings → Printer Settings.',
          variant: 'destructive',
        });
      } else if (method === 'web-bluetooth' && !isWBSupported) {
        toast({
          title: 'Not Supported',
          description: 'Web Bluetooth is not supported in this browser. Use Chrome on Android or desktop.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'No Printer Configured',
          description: 'Please select a printer in Settings → Printer Settings.',
          variant: 'destructive',
        });
      }
      return;
    }

    setIsPrinting(true);
    try {
      await printCollectionSlip(slipData, template);
      // Record that the farmer now holds paper with these figures on it. Only
      // the first print counts, so a reprint does not extend how long the row
      // stays editable.
      const { error: stampError } = await supabase.rpc('fn_mark_slip_printed', {
        p_collection_id: collection.id,
      });
      if (stampError) console.error('could not record the print', stampError.message);
      else queryClient.invalidateQueries({ queryKey: ['milk-collections'] });
      toast({
        title: 'Print Sent',
        description: method === 'rawbt'
          ? 'Sent to RawBT. Check the printer for the slip.'
          : 'Collection slip printed successfully!',
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
          {method === 'rawbt' ? (
            onAndroid ? (
              <p className="text-muted-foreground">
                Method: <span className="font-medium text-foreground">RawBT</span> (Android print service)
              </p>
            ) : (
              <p className="text-destructive">
                RawBT only works on Android. Switch to Web Bluetooth in Settings → Printer Settings.
              </p>
            )
          ) : isWBSupported ? (
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
            disabled={isPrinting || !canPrint}
          >
            <Printer className={`h-4 w-4 mr-2 ${isPrinting ? 'animate-pulse' : ''}`} />
            {isPrinting ? 'Printing...' : 'Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
