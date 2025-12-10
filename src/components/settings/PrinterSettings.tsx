import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, RefreshCw, Check, X, Bluetooth, TestTube, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  isWebBluetoothSupported,
  isSecureContext,
  scanForPrinters,
  connectToPrinter,
  getSavedPrinter,
  savePrinter,
  clearSavedPrinter,
  printTestSlip,
  BluetoothDevice,
} from '@/services/thermalPrinting';

export const PrinterSettings: React.FC = () => {
  const [printers, setPrinters] = useState<BluetoothDevice[]>([]);
  const [savedPrinter, setSavedPrinter] = useState<BluetoothDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'saved'>('disconnected');
  const { toast } = useToast();

  const isSupported = isWebBluetoothSupported();
  const isSecure = isSecureContext();

  useEffect(() => {
    const saved = getSavedPrinter();
    if (saved) {
      setSavedPrinter(saved);
      setConnectionStatus('saved');
    }
  }, []);

  const handleScanPrinters = async () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Web Bluetooth is not supported. Use Chrome on Android or desktop.',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setPrinters([]);
    
    try {
      await scanForPrinters(
        (devices) => setPrinters(devices),
        () => setIsScanning(false)
      );
    } catch (error) {
      setIsScanning(false);
      toast({
        title: 'Scan Failed',
        description: 'Failed to scan for printers.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectPrinter = async (device: BluetoothDevice) => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    try {
      const connected = await connectToPrinter(device.address);
      if (connected) {
        savePrinter(device);
        setSavedPrinter(device);
        setConnectionStatus('saved');
        setPrinters([]);
        toast({
          title: 'Printer Selected',
          description: `${device.name} has been set as your default printer.`,
        });
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to the printer.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemovePrinter = () => {
    clearSavedPrinter();
    setSavedPrinter(null);
    setConnectionStatus('disconnected');
    toast({ title: 'Printer Removed', description: 'Default printer has been removed.' });
  };

  const handleTestPrint = async () => {
    if (!savedPrinter) return;
    setIsTesting(true);
    try {
      await printTestSlip();
      toast({ title: 'Test Successful', description: 'Test slip printed successfully!' });
    } catch (error: any) {
      toast({ title: 'Print Failed', description: error.message || 'Failed to print test slip.', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isSupported || !isSecure) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {!isSupported ? (
            <><strong>Web Bluetooth not supported.</strong> Use Chrome on Android or desktop.</>
          ) : (
            <><strong>HTTPS Required.</strong> Web Bluetooth only works on secure (HTTPS) connections. Current: {window.location.origin}</>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{savedPrinter ? savedPrinter.name : 'No Printer Selected'}</p>
                <p className="text-sm text-muted-foreground">
                  {savedPrinter ? 'Default printer' : 'Select a printer to enable slip printing'}
                </p>
              </div>
            </div>
            {savedPrinter && (
              <Badge variant="secondary">
                <Bluetooth className="h-3 w-3 mr-1" /> Saved
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleScanPrinters} disabled={isScanning || isConnecting}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan for Printers'}
        </Button>
        {savedPrinter && (
          <>
            <Button variant="outline" onClick={handleTestPrint} disabled={isTesting}>
              <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
              {isTesting ? 'Printing...' : 'Test Print'}
            </Button>
            <Button variant="outline" onClick={handleRemovePrinter}>
              <X className="h-4 w-4 mr-2" /> Remove
            </Button>
          </>
        )}
      </div>

      {printers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Found Printers</p>
          {printers.map((printer) => (
            <Card key={printer.address} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectPrinter(printer)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bluetooth className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{printer.name}</span>
                </div>
                <Button size="sm" disabled={isConnecting}>{isConnecting ? 'Connecting...' : 'Select'}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <strong>How to connect:</strong>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            <li>Turn on your thermal printer</li>
            <li>Click "Scan for Printers" - Chrome will show a picker</li>
            <li>Select your printer from the list</li>
            <li>Use "Test Print" to verify connection</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
