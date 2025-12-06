import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, RefreshCw, Check, X, Bluetooth, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  isNativePlatform,
  scanForPrinters,
  stopScan,
  connectToPrinter,
  disconnectPrinter,
  isConnected,
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
  const printersRef = useRef<BluetoothDevice[]>([]);

  const isNative = isNativePlatform();

  useEffect(() => {
    // Load saved printer on mount
    const saved = getSavedPrinter();
    if (saved) {
      setSavedPrinter(saved);
      setConnectionStatus('saved');
    }
  }, []);

  const handleScanPrinters = async () => {
    if (!isNative) {
      toast({
        title: 'Not Available',
        description: 'Bluetooth printing is only available on the mobile app.',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    printersRef.current = [];
    setPrinters([]);
    
    try {
      await scanForPrinters(
        (devices) => {
          // Merge new devices with existing ones (avoid duplicates)
          const newPrinters = [...printersRef.current];
          devices.forEach(device => {
            if (!newPrinters.find(p => p.address === device.address)) {
              newPrinters.push(device);
            }
          });
          printersRef.current = newPrinters;
          setPrinters(newPrinters);
        },
        () => {
          setIsScanning(false);
          if (printersRef.current.length === 0) {
            toast({
              title: 'No Printers Found',
              description: 'Please pair your printer via Android Bluetooth settings first.',
            });
          } else {
            toast({
              title: 'Scan Complete',
              description: `Found ${printersRef.current.length} device(s).`,
            });
          }
        }
      );
    } catch (error) {
      setIsScanning(false);
      toast({
        title: 'Scan Failed',
        description: 'Failed to scan for printers. Please check Bluetooth permissions.',
        variant: 'destructive',
      });
    }
  };

  const handleStopScan = async () => {
    await stopScan();
    setIsScanning(false);
  };

  const handleSelectPrinter = async (device: BluetoothDevice) => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    try {
      const connected = await connectToPrinter(device.address);
      if (connected) {
        savePrinter(device);
        setSavedPrinter(device);
        setConnectionStatus('connected');
        await disconnectPrinter(); // Disconnect after test
        setConnectionStatus('saved');
        toast({
          title: 'Printer Selected',
          description: `${device.name} has been set as your default printer.`,
        });
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to the printer. Make sure it is turned on.',
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
    toast({
      title: 'Printer Removed',
      description: 'Default printer has been removed.',
    });
  };

  const handleTestPrint = async () => {
    if (!savedPrinter) {
      toast({
        title: 'No Printer',
        description: 'Please select a printer first.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      await printTestSlip();
      toast({
        title: 'Test Successful',
        description: 'Test slip printed successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Print Failed',
        description: error.message || 'Failed to print test slip.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isNative) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Printer className="h-5 w-5" />
            <div>
              <p className="font-medium">Bluetooth Printing</p>
              <p className="text-sm">
                Printing is only available on the mobile app. Export this project to GitHub and build the Android app to enable printing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Printer Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {savedPrinter ? savedPrinter.name : 'No Printer Selected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {savedPrinter ? savedPrinter.address : 'Select a printer to enable slip printing'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {savedPrinter && (
                <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                  {connectionStatus === 'connected' ? (
                    <><Check className="h-3 w-3 mr-1" /> Connected</>
                  ) : connectionStatus === 'connecting' ? (
                    <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Connecting</>
                  ) : (
                    <><Bluetooth className="h-3 w-3 mr-1" /> Saved</>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={isScanning ? handleStopScan : handleScanPrinters}
          disabled={isConnecting}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Stop Scan' : 'Scan for Printers'}
        </Button>

        {savedPrinter && (
          <>
            <Button
              variant="outline"
              onClick={handleTestPrint}
              disabled={isTesting}
            >
              <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
              {isTesting ? 'Printing...' : 'Test Print'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRemovePrinter}
            >
              <X className="h-4 w-4 mr-2" />
              Remove Printer
            </Button>
          </>
        )}
      </div>

      {/* Available Printers List */}
      {printers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Available Printers</p>
          <div className="grid gap-2">
            {printers.map((printer) => (
              <Card
                key={printer.address}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  savedPrinter?.address === printer.address ? 'border-primary' : ''
                }`}
                onClick={() => handleSelectPrinter(printer)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bluetooth className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{printer.name || 'Unknown Device'}</p>
                        <p className="text-xs text-muted-foreground">{printer.address}</p>
                      </div>
                    </div>
                    {savedPrinter?.address === printer.address && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Setup Instructions:</strong>
          </p>
          <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
            <li>Turn on your thermal printer</li>
            <li>Go to Android Settings → Bluetooth and pair the printer</li>
            <li>Return here and tap "Scan for Printers"</li>
            <li>Select your printer from the list</li>
            <li>Use "Test Print" to verify the connection</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
