import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Printer, RefreshCw, Check, X, Bluetooth, TestTube, AlertCircle, Smartphone, ExternalLink } from 'lucide-react';
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
  getPrintMethod,
  setPrintMethod,
  isAndroid,
  PrintMethod,
  getAutoCut,
  setAutoCut,
} from '@/services/thermalPrinting';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const RAWBT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter';

export const PrinterSettings: React.FC = () => {
  const [method, setMethod] = useState<PrintMethod>(getPrintMethod());
  const [printers, setPrinters] = useState<BluetoothDevice[]>([]);
  const [savedPrinter, setSavedPrinter] = useState<BluetoothDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [autoCut, setAutoCutState] = useState(getAutoCut());
  const { toast } = useToast();

  const isSupported = isWebBluetoothSupported();
  const isSecure = isSecureContext();
  const onAndroid = isAndroid();

  useEffect(() => {
    const saved = getSavedPrinter();
    if (saved) setSavedPrinter(saved);
  }, []);

  const handleMethodChange = (next: string) => {
    const m = next as PrintMethod;
    setMethod(m);
    setPrintMethod(m);
  };

  const handleAutoCutChange = (enabled: boolean) => {
    setAutoCutState(enabled);
    setAutoCut(enabled);
  };

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
    } catch {
      setIsScanning(false);
      toast({ title: 'Scan Failed', description: 'Failed to scan for printers.', variant: 'destructive' });
    }
  };

  const handleSelectPrinter = async (device: BluetoothDevice) => {
    setIsConnecting(true);
    try {
      const connected = await connectToPrinter(device.address);
      if (connected) {
        savePrinter(device);
        setSavedPrinter(device);
        setPrinters([]);
        toast({ title: 'Printer Selected', description: `${device.name} has been set as your default printer.` });
      }
    } catch {
      toast({ title: 'Connection Failed', description: 'Failed to connect to the printer.', variant: 'destructive' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemovePrinter = () => {
    clearSavedPrinter();
    setSavedPrinter(null);
    toast({ title: 'Printer Removed', description: 'Default printer has been removed.' });
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      await printTestSlip();
      const msg = method === 'rawbt'
        ? 'Sent to RawBT. Check the printed slip.'
        : 'Test slip printed successfully!';
      toast({ title: 'Print Sent', description: msg });
    } catch (error: any) {
      toast({ title: 'Print Failed', description: error.message || 'Failed to print test slip.', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
    <Tabs value={method} onValueChange={handleMethodChange} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="rawbt" disabled={!onAndroid && method !== 'rawbt'}>
          <Smartphone className="h-4 w-4 mr-2" />
          RawBT (Android)
        </TabsTrigger>
        <TabsTrigger value="web-bluetooth">
          <Bluetooth className="h-4 w-4 mr-2" />
          Web Bluetooth
        </TabsTrigger>
      </TabsList>

      {/* RawBT panel */}
      <TabsContent value="rawbt" className="space-y-4">
        {!onAndroid ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>RawBT is Android-only.</strong> Open this app in Chrome on an Android phone to use the RawBT print path, or switch to Web Bluetooth above.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Print via RawBT</p>
                    <p className="text-sm text-muted-foreground">
                      Works with any 58 mm Bluetooth ESC/POS printer. Printer pairing is managed inside RawBT, not in this app.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleTestPrint} disabled={isTesting}>
                <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
                {isTesting ? 'Sending…' : 'Test Print'}
              </Button>
              <Button variant="outline" asChild>
                <a href={RAWBT_PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Install RawBT
                </a>
              </Button>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                <strong>One-time setup on each phone:</strong>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Install <em>RawBT print service</em> from Play Store (link above).</li>
                  <li>Open RawBT → tap the printer icon → pair your 58 mm Bluetooth printer.</li>
                  <li>Come back here and tap <em>Test Print</em> to confirm.</li>
                </ol>
                <p className="pt-2">
                  Each print briefly opens RawBT and returns to this app. If RawBT is not installed, the Play Store opens instead.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* Web Bluetooth panel */}
      <TabsContent value="web-bluetooth" className="space-y-4">
        {(!isSupported || !isSecure) ? (
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
        ) : (
          <>
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
                        {savedPrinter ? 'Default printer' : 'Select a BLE printer to enable slip printing'}
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
                <p className="mt-2">
                  Web Bluetooth only works with BLE (Bluetooth Low Energy) printers. If your printer doesn't appear in the picker, it is likely Bluetooth Classic / SPP — switch to the RawBT tab above.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>

    {/* Applies to both transports: it changes the bytes, not the link. */}
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="auto-cut" className="font-medium">Cut paper after each slip</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Sends a cut command at the end of every slip. Printers without a cutter ignore it
              safely — turn this on and run a Test Print to see whether yours supports it.
            </p>
          </div>
          <Switch id="auto-cut" checked={autoCut} onCheckedChange={handleAutoCutChange} />
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
