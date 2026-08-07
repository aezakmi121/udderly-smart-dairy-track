import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppSetting } from '@/hooks/useAppSettings';
import { SLIP_TEMPLATE_KEY, normaliseTemplate, type SlipTemplate } from '@/services/slipTemplate';
import {
  isWebBluetoothSupported,
  printBillSlip,
  getBillSlipPreview,
  getSavedPrinter,
  getPrintMethod,
  isAndroid,
  type BillSlipData,
} from '@/services/thermalPrinting';
import type { PayoutRow } from '@/hooks/usePayouts';

interface PrintBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: (PayoutRow & { cycle_start?: string; cycle_end?: string; portal_token?: string | null }) | null;
}

/**
 * Print a payout bill on the 58mm roll.
 *
 * The PDF only ever reached farmers with a phone, which is fewer than half of
 * them, and only through the portal -- the office had no way to produce a bill
 * at all. Payout day is also when a farmer is most likely to scan the QR, so
 * the same code that goes on a collection slip goes here.
 */
export const PrintBillDialog: React.FC<PrintBillDialogProps> = ({ open, onOpenChange, payout }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();
  const { value: storedTemplate } = useAppSetting<SlipTemplate>(SLIP_TEMPLATE_KEY);
  const template = normaliseTemplate(storedTemplate);

  const method = getPrintMethod();
  const canPrint = method === 'rawbt' ? isAndroid() : isWebBluetooth();

  function isWebBluetooth() {
    return isWebBluetoothSupported() && !!getSavedPrinter();
  }

  if (!payout) return null;

  const billData: BillSlipData = {
    farmerName: payout.farmers?.name ?? 'Unknown Farmer',
    farmerCode: payout.farmers?.farmer_code ?? 'N/A',
    billNumber: payout.bill_number,
    cycleStart: payout.cycle_start ?? '',
    cycleEnd: payout.cycle_end ?? '',
    totalQuantity: Number(payout.total_quantity ?? 0),
    sessionsCount: Number(payout.sessions_count ?? 0),
    avgFat: payout.avg_fat,
    avgSnf: payout.avg_snf,
    totalAmount: Number(payout.total_amount ?? 0),
    advancesDeducted: Number(payout.advances_deducted ?? 0),
    carryForwardIn: Number(payout.carry_forward_in ?? 0),
    otherDeductions: Number(payout.other_deductions ?? 0),
    netPayable: Number(payout.net_payable ?? 0),
    paidAmount: Number(payout.paid_amount ?? 0),
    portalUrl: payout.portal_token
      ? `${window.location.origin}/f/${payout.portal_token}`
      : null,
  };

  const handlePrint = async () => {
    if (!canPrint) {
      toast({
        title: 'No printer configured',
        description:
          method === 'rawbt'
            ? 'RawBT only works on Android. Switch method in Settings → Printer Settings.'
            : 'Select a printer in Settings → Printer Settings.',
        variant: 'destructive',
      });
      return;
    }
    setIsPrinting(true);
    try {
      await printBillSlip(billData, template);
      toast({ title: 'Bill sent to the printer' });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Print failed',
        description: error.message ?? 'Check the printer connection.',
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
            <Printer className="h-5 w-5" /> Print Bill
          </DialogTitle>
        </DialogHeader>

        <Card className="bg-muted/50 p-4">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
            {getBillSlipPreview(billData, template)}
          </pre>
        </Card>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting || !canPrint}>
            <Printer className={`mr-2 h-4 w-4 ${isPrinting ? 'animate-pulse' : ''}`} />
            {isPrinting ? 'Printing…' : 'Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
