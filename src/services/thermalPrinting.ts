// Types for thermal printing
export interface BluetoothDevice {
  name: string;
  address: string;
  device?: any; // Web Bluetooth device reference
}

export interface CollectionSlipData {
  farmerName: string;
  farmerCode: string;
  date: string;
  session: 'morning' | 'evening';
  quantity: number;
  fatPercentage: number;
  snfPercentage: number;
  ratePerLiter: number;
  totalAmount: number;
  species: string;
  // Which rate list priced this collection, when it was recorded.
  rateEffectiveFrom?: string | null;
  rateEffectiveSession?: string | null;
}

// Storage keys
const SAVED_PRINTER_KEY = 'thermal_printer_address';
const SAVED_PRINTER_NAME_KEY = 'thermal_printer_name';
const PRINT_METHOD_KEY = 'thermal_print_method';
const AUTO_CUT_KEY = 'thermal_auto_cut';

// Print transport method
export type PrintMethod = 'rawbt' | 'web-bluetooth';

// RawBT Android package identifier
const RAWBT_PACKAGE = 'ru.a402d.rawbtprinter';

// Common thermal printer service UUIDs (different printers use different UUIDs)
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Generic SPP
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Some Chinese printers
  '0000ff00-0000-1000-8000-00805f9b34fb', // Another common one
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 style
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
];

// Connected device reference
let connectedDevice: any = null;
let printerCharacteristic: any = null;
let gattServer: any = null;

// Check if Web Bluetooth is supported
export const isWebBluetoothSupported = (): boolean => {
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  console.log('Web Bluetooth supported:', supported);
  return supported;
};

// Check if running in secure context (required for Web Bluetooth)
export const isSecureContext = (): boolean => {
  const secure = window.isSecureContext;
  console.log('Secure context:', secure, 'URL:', window.location.origin);
  return secure;
};

// Check if running on native platform (for backward compatibility)
export const isNativePlatform = (): boolean => {
  return isWebBluetoothSupported();
};

// Detect Android — RawBT is Android-only
export const isAndroid = (): boolean => {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
};

// RawBT is only usable inside an Android browser/PWA where the intent: scheme works
export const isRawBTAvailable = (): boolean => {
  return isAndroid();
};

// Currently selected print transport (user override or platform default)
export const getPrintMethod = (): PrintMethod => {
  const stored = localStorage.getItem(PRINT_METHOD_KEY);
  if (stored === 'rawbt' || stored === 'web-bluetooth') return stored;
  return isAndroid() ? 'rawbt' : 'web-bluetooth';
};

export const setPrintMethod = (method: PrintMethod): void => {
  localStorage.setItem(PRINT_METHOD_KEY, method);
};

// Auto-cut is off by default: printers without a cutter ignore the command,
// but leaving it opt-in means a printer that mishandles it cannot spoil slips
// until the user has tried it once and seen the result.
export const getAutoCut = (): boolean => localStorage.getItem(AUTO_CUT_KEY) === 'on';

export const setAutoCut = (enabled: boolean): void => {
  localStorage.setItem(AUTO_CUT_KEY, enabled ? 'on' : 'off');
};

// Get saved printer from localStorage
export const getSavedPrinter = (): BluetoothDevice | null => {
  const address = localStorage.getItem(SAVED_PRINTER_KEY);
  const name = localStorage.getItem(SAVED_PRINTER_NAME_KEY);
  if (address && name) {
    return { address, name };
  }
  return null;
};

// Save printer to localStorage
export const savePrinter = (device: BluetoothDevice): void => {
  localStorage.setItem(SAVED_PRINTER_KEY, device.address);
  localStorage.setItem(SAVED_PRINTER_NAME_KEY, device.name);
};

// Clear saved printer
export const clearSavedPrinter = (): void => {
  localStorage.removeItem(SAVED_PRINTER_KEY);
  localStorage.removeItem(SAVED_PRINTER_NAME_KEY);
  if (gattServer?.connected) {
    gattServer.disconnect();
  }
  connectedDevice = null;
  printerCharacteristic = null;
  gattServer = null;
};

// Scan for Bluetooth printers using Web Bluetooth API
export const scanForPrinters = async (
  onDeviceFound: (devices: BluetoothDevice[]) => void,
  onScanComplete: () => void
): Promise<void> => {
  console.log('Starting Bluetooth scan...');
  
  if (!isWebBluetoothSupported()) {
    console.error('Web Bluetooth is not supported in this browser');
    onScanComplete();
    return;
  }

  if (!isSecureContext()) {
    console.error('Web Bluetooth requires HTTPS (secure context)');
    onScanComplete();
    return;
  }

  try {
    // Request device - this shows the browser's Bluetooth picker
    // acceptAllDevices allows seeing all nearby devices
    console.log('Requesting Bluetooth device...');
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICE_UUIDS
    });

    console.log('Device selected:', device?.name, device?.id);

    if (device) {
      const bluetoothDevice: BluetoothDevice = {
        name: device.name || 'Unknown Printer',
        address: device.id,
        device: device
      };
      connectedDevice = device; // Store the device reference
      onDeviceFound([bluetoothDevice]);
    }
    onScanComplete();
  } catch (error: any) {
    if (error?.name === 'NotFoundError') {
      console.log('User cancelled Bluetooth picker');
    } else {
      console.error('Error scanning for printers:', error);
    }
    onScanComplete();
  }
};

// Stop scanning (not needed for Web Bluetooth as picker handles this)
export const stopScan = async (): Promise<void> => {
  // Web Bluetooth doesn't need explicit stop - the picker handles it
};

// The GATT link can drop on its own (printer sleeps, goes out of range, is
// power-cycled). Anything discovered over that link is invalid afterwards.
const handleDisconnected = () => {
  console.log('Printer GATT disconnected — clearing cached handles');
  printerCharacteristic = null;
  gattServer = null;
};

// Connect to a specific printer (or use already selected device)
export const connectToPrinter = async (address: string): Promise<BluetoothDevice | null> => {
  console.log('Connecting to printer:', address);
  
  if (!isWebBluetoothSupported()) {
    console.error('Web Bluetooth is not supported in this browser');
    return null;
  }

  try {
    // If we already have a device selected from scan, use it
    if (connectedDevice && connectedDevice.id === address) {
      console.log('Using already selected device:', connectedDevice.name);
    } else if (!connectedDevice) {
      // Need to request device again
      console.log('No device in memory, requesting new device...');
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS
      });
      connectedDevice = device;
    }

    if (!connectedDevice) {
      console.error('No device available');
      return null;
    }

    // Drop any characteristic held from a previous GATT session before
    // rediscovering. A characteristic object does not survive a disconnect:
    // keeping it would both short-circuit the discovery loops below (they bail
    // out as soon as printerCharacteristic is truthy) and leave writes going to
    // a dead handle — the printer resets, feeds a little and prints nothing.
    printerCharacteristic = null;

    // Connect to GATT server
    console.log('Connecting to GATT server...');
    gattServer = await connectedDevice.gatt?.connect();
    console.log('GATT connected:', gattServer?.connected);

    // Clear the cached handles as soon as the link drops, so the next print
    // rediscovers instead of reusing them.
    connectedDevice.removeEventListener?.('gattserverdisconnected', handleDisconnected);
    connectedDevice.addEventListener?.('gattserverdisconnected', handleDisconnected);

    if (gattServer) {
      // Try each service UUID until we find one that works
      for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
        try {
          console.log('Trying service UUID:', serviceUuid);
          const service = await gattServer.getPrimaryService(serviceUuid);
          console.log('Service found:', serviceUuid);
          
          // Try each characteristic UUID
          for (const charUuid of PRINTER_CHARACTERISTIC_UUIDS) {
            try {
              console.log('Trying characteristic UUID:', charUuid);
              printerCharacteristic = await service.getCharacteristic(charUuid);
              console.log('Characteristic found:', charUuid);
              break;
            } catch {
              // Try next characteristic
            }
          }
          
          if (printerCharacteristic) break;
        } catch {
          // Try next service
        }
      }

      if (!printerCharacteristic) {
        console.log('No matching service/characteristic found, will try direct write');
        // Some printers work by getting all services and characteristics
        try {
          const services = await gattServer.getPrimaryServices();
          console.log('Available services:', services.length);
          for (const service of services) {
            console.log('Service:', service.uuid);
            try {
              const chars = await service.getCharacteristics();
              for (const char of chars) {
                console.log('  Characteristic:', char.uuid, 'Properties:', char.properties);
                // Look for writable characteristic
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  printerCharacteristic = char;
                  console.log('Using writable characteristic:', char.uuid);
                  break;
                }
              }
              if (printerCharacteristic) break;
            } catch (e) {
              console.log('Could not get characteristics for service');
            }
          }
        } catch (e) {
          console.log('Could not enumerate services:', e);
        }
      }
    }

    return {
      name: connectedDevice.name || 'Unknown Printer',
      address: connectedDevice.id,
      device: connectedDevice
    };
  } catch (error) {
    console.error('Error connecting to printer:', error);
    throw error;
  }
};

// Check if connected
export const isConnected = async (): Promise<boolean> => {
  return connectedDevice?.gatt?.connected || false;
};

// Disconnect from printer
export const disconnectPrinter = async (): Promise<void> => {
  if (connectedDevice?.gatt?.connected) {
    connectedDevice.gatt.disconnect();
  }
  connectedDevice = null;
  printerCharacteristic = null;
};

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const ESC_POS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  CUT: [GS, 0x56, 0x00],
  FEED: [LF],
};

// Collections store species capitalised ('Cow' / 'Buffalo'); match case-insensitively
// so anything else still falls back to 'Mixed'.
const formatSpecies = (species: string): string => {
  switch (species?.trim().toLowerCase()) {
    case 'cow':
      return 'Cow';
    case 'buffalo':
      return 'Buffalo';
    default:
      return 'Mixed';
  }
};

// The rate list a collection was priced on, for settling disputes.
const formatRateVersion = (data: CollectionSlipData): string =>
  data.rateEffectiveSession === 'evening'
    ? `${data.rateEffectiveFrom} PM`
    : `${data.rateEffectiveFrom}`;

// Convert text to bytes
const textToBytes = (text: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i));
  }
  return bytes;
};

// Build print data for collection slip
const buildSlipData = (data: CollectionSlipData): Uint8Array => {
  const commands: number[] = [];
  
  const sessionLabel = data.session === 'morning' ? 'AM' : 'PM';
  const speciesLabel = formatSpecies(data.species);

  // Initialize
  commands.push(...ESC_POS.INIT);
  
  // Header
  commands.push(...ESC_POS.ALIGN_CENTER);
  commands.push(...ESC_POS.BOLD_ON);
  commands.push(...textToBytes('================================\n'));
  commands.push(...textToBytes('DAIRY COLLECTION SLIP\n'));
  commands.push(...textToBytes('================================\n'));
  commands.push(...ESC_POS.BOLD_OFF);
  
  // Date and Session
  commands.push(...ESC_POS.ALIGN_LEFT);
  commands.push(...textToBytes(`Date: ${data.date}  Session: ${sessionLabel}\n`));
  commands.push(...ESC_POS.ALIGN_CENTER);
  commands.push(...textToBytes('--------------------------------\n'));
  
  // Farmer info
  commands.push(...ESC_POS.ALIGN_LEFT);
  commands.push(...textToBytes(`Farmer: ${data.farmerName}\n`));
  commands.push(...textToBytes(`Code: ${data.farmerCode}\n`));
  commands.push(...textToBytes(`Species: ${speciesLabel}\n`));
  commands.push(...ESC_POS.ALIGN_CENTER);
  commands.push(...textToBytes('--------------------------------\n'));
  
  // Milk details
  commands.push(...ESC_POS.ALIGN_LEFT);
  commands.push(...textToBytes(`Quantity:     ${data.quantity.toFixed(2)} L\n`));
  commands.push(...textToBytes(`Fat:          ${data.fatPercentage.toFixed(1)}%\n`));
  commands.push(...textToBytes(`SNF:          ${data.snfPercentage.toFixed(1)}%\n`));
  commands.push(...textToBytes(`Rate:         Rs.${data.ratePerLiter.toFixed(2)}/L\n`));
  if (data.rateEffectiveFrom) {
    commands.push(...textToBytes(`Rate list:    ${formatRateVersion(data)}\n`));
  }
  commands.push(...ESC_POS.ALIGN_CENTER);
  commands.push(...textToBytes('--------------------------------\n'));
  
  // Total
  commands.push(...ESC_POS.ALIGN_LEFT);
  commands.push(...ESC_POS.BOLD_ON);
  commands.push(...textToBytes(`TOTAL:        Rs.${data.totalAmount.toFixed(2)}\n`));
  commands.push(...ESC_POS.BOLD_OFF);
  
  // Footer
  commands.push(...ESC_POS.ALIGN_CENTER);
  commands.push(...textToBytes('================================\n'));
  commands.push(...textToBytes('Thank you!\n'));
  commands.push(...textToBytes('================================\n'));
  
  // Feed paper
  commands.push(...ESC_POS.FEED);
  commands.push(...ESC_POS.FEED);
  commands.push(...ESC_POS.FEED);

  // Printers without a cutter ignore this; it is opt-in regardless.
  if (getAutoCut()) {
    commands.push(...ESC_POS.CUT);
  }

  return new Uint8Array(commands);
};

// Build print data for the test slip
const buildTestSlipData = (printerLabel: string): Uint8Array => {
  const commands: number[] = [];
  commands.push(...ESC_POS.INIT);
  commands.push(...ESC_POS.ALIGN_CENTER);
  commands.push(...ESC_POS.BOLD_ON);
  commands.push(...textToBytes('================================\n'));
  commands.push(...textToBytes('TEST PRINT\n'));
  commands.push(...textToBytes('================================\n'));
  commands.push(...ESC_POS.BOLD_OFF);
  commands.push(...ESC_POS.ALIGN_LEFT);
  commands.push(...textToBytes(`Printer: ${printerLabel}\n`));
  commands.push(...textToBytes(`Time: ${new Date().toLocaleTimeString()}\n`));
  commands.push(...ESC_POS.ALIGN_CENTER);
  commands.push(...textToBytes('================================\n'));
  commands.push(...textToBytes('Print test successful!\n'));
  commands.push(...textToBytes('================================\n'));
  commands.push(...ESC_POS.FEED);
  commands.push(...ESC_POS.FEED);
  commands.push(...ESC_POS.FEED);
  return new Uint8Array(commands);
};

// Send raw ESC/POS bytes via RawBT on Android. RawBT receives the intent,
// hands the bytes to its already-paired Bluetooth printer over SPP, and the
// user returns to the PWA. If RawBT is not installed, Chrome opens the Play
// Store listing — the caller cannot tell printing actually succeeded.
const printViaRawBT = (bytes: Uint8Array): boolean => {
  if (!isAndroid()) {
    throw new Error('RawBT only works on Android. Open this app in Chrome on Android, or switch to Web Bluetooth in Printer Settings.');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  // The data part must NOT carry its own 'rawbt:' prefix. Android's intent:
  // parser prepends the scheme= value to it, so 'intent:rawbt:base64,...' with
  // scheme=rawbt resolves to 'rawbt:rawbt:base64,...' — RawBT launches and
  // initialises the printer but cannot decode the payload, so the paper feeds
  // and nothing prints. The payload is inserted unencoded, as RawBT expects.
  const intentUrl = `intent:base64,${b64}#Intent;scheme=rawbt;package=${RAWBT_PACKAGE};end;`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = intentUrl;
  document.body.appendChild(iframe);
  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { /* already removed */ }
  }, 1500);
  return true;
};

// Send bytes to the printer over Web Bluetooth (existing transport).
const printViaWebBluetooth = async (bytes: Uint8Array): Promise<boolean> => {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Use Chrome on Android or desktop.');
  }
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    throw new Error('No printer configured. Please select a printer in settings.');
  }
  // Reconnect if the link is down or if the characteristic was cleared by a
  // disconnect — either way the handle has to be rediscovered before writing.
  if (!connectedDevice?.gatt?.connected || !printerCharacteristic) {
    await connectToPrinter(savedPrinter.address);
  }
  if (!printerCharacteristic) {
    throw new Error('Printer characteristic not available');
  }
  const chunkSize = 20;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    await printerCharacteristic.writeValue(chunk);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
};

// Print collection slip — dispatches to the configured transport (RawBT or Web Bluetooth)
export const printCollectionSlip = async (data: CollectionSlipData): Promise<boolean> => {
  const bytes = buildSlipData(data);
  const method = getPrintMethod();
  if (method === 'rawbt') return printViaRawBT(bytes);
  return printViaWebBluetooth(bytes);
};

// Print a test slip — dispatches to the configured transport
export const printTestSlip = async (): Promise<boolean> => {
  const method = getPrintMethod();
  if (method === 'rawbt') {
    return printViaRawBT(buildTestSlipData('RawBT'));
  }
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    throw new Error('No printer configured. Please select a printer in settings.');
  }
  return printViaWebBluetooth(buildTestSlipData(savedPrinter.name));
};

// Get preview text for slip (for UI display)
export const getSlipPreview = (data: CollectionSlipData): string => {
  const sessionLabel = data.session === 'morning' ? 'AM' : 'PM';
  const speciesLabel = formatSpecies(data.species);

  return `================================
     DAIRY COLLECTION SLIP
================================
Date: ${data.date}  Session: ${sessionLabel}
--------------------------------
Farmer: ${data.farmerName}
Code: ${data.farmerCode}
Species: ${speciesLabel}
--------------------------------
Quantity:     ${data.quantity.toFixed(2)} L
Fat:          ${data.fatPercentage.toFixed(1)}%
SNF:          ${data.snfPercentage.toFixed(1)}%
Rate:         Rs.${data.ratePerLiter.toFixed(2)}/L${data.rateEffectiveFrom ? `
Rate list:    ${formatRateVersion(data)}` : ''}
--------------------------------
TOTAL:        Rs.${data.totalAmount.toFixed(2)}
================================
         Thank you!
================================`;
};
