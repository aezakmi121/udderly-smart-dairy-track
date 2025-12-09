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
}

// Storage keys
const SAVED_PRINTER_KEY = 'thermal_printer_address';
const SAVED_PRINTER_NAME_KEY = 'thermal_printer_name';

// Common thermal printer service UUIDs
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Connected device reference
let connectedDevice: any = null;
let printerCharacteristic: any = null;

// Check if Web Bluetooth is supported
export const isWebBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

// Check if running on native platform (for backward compatibility)
export const isNativePlatform = (): boolean => {
  return isWebBluetoothSupported();
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
  connectedDevice = null;
  printerCharacteristic = null;
};

// Scan for Bluetooth printers using Web Bluetooth API
export const scanForPrinters = async (
  onDeviceFound: (devices: BluetoothDevice[]) => void,
  onScanComplete: () => void
): Promise<void> => {
  if (!isWebBluetoothSupported()) {
    console.warn('Web Bluetooth is not supported in this browser');
    onScanComplete();
    return;
  }

  try {
    // Request device - this shows the browser's Bluetooth picker
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [PRINTER_SERVICE_UUID, '18f0']
    });

    if (device) {
      const bluetoothDevice: BluetoothDevice = {
        name: device.name || 'Unknown Printer',
        address: device.id,
        device: device
      };
      onDeviceFound([bluetoothDevice]);
    }
    onScanComplete();
  } catch (error) {
    if ((error as Error).name === 'NotFoundError') {
      // User cancelled the picker
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

// Connect to a specific printer
export const connectToPrinter = async (address: string): Promise<BluetoothDevice | null> => {
  if (!isWebBluetoothSupported()) {
    console.warn('Web Bluetooth is not supported in this browser');
    return null;
  }

  try {
    // For Web Bluetooth, we need to request device again if not already connected
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [PRINTER_SERVICE_UUID, '18f0']
    });

    if (device) {
      connectedDevice = device;
      
      // Connect to GATT server
      const server = await device.gatt?.connect();
      
      if (server) {
        try {
          // Try to get the printer service
          const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
          printerCharacteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);
        } catch {
          // Try alternative service UUID format
          try {
            const service = await server.getPrimaryService('18f0');
            printerCharacteristic = await service.getCharacteristic('2af1');
          } catch (e) {
            console.log('Using fallback print method');
          }
        }
      }

      return {
        name: device.name || 'Unknown Printer',
        address: device.id,
        device: device
      };
    }
    return null;
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
  const speciesLabel = data.species === 'cow' ? 'Cow' : data.species === 'buffalo' ? 'Buffalo' : 'Mixed';

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

  return new Uint8Array(commands);
};

// Print collection slip
export const printCollectionSlip = async (data: CollectionSlipData): Promise<boolean> => {
  if (!isWebBluetoothSupported()) {
    console.warn('Web Bluetooth is not supported in this browser');
    return false;
  }

  try {
    const savedPrinter = getSavedPrinter();
    
    if (!savedPrinter) {
      throw new Error('No printer configured. Please select a printer in settings.');
    }

    // Ensure we're connected
    if (!connectedDevice?.gatt?.connected) {
      await connectToPrinter(savedPrinter.address);
    }

    const printData = buildSlipData(data);

    if (printerCharacteristic) {
      // Send data in chunks (BLE has packet size limits)
      const chunkSize = 20;
      for (let i = 0; i < printData.length; i += chunkSize) {
        const chunk = printData.slice(i, i + chunkSize);
        await printerCharacteristic.writeValue(chunk);
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } else {
      console.error('Printer characteristic not available');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error printing slip:', error);
    throw error;
  }
};

// Print a test slip
export const printTestSlip = async (): Promise<boolean> => {
  if (!isWebBluetoothSupported()) {
    console.warn('Web Bluetooth is not supported in this browser');
    return false;
  }

  try {
    const savedPrinter = getSavedPrinter();
    
    if (!savedPrinter) {
      throw new Error('No printer configured. Please select a printer in settings.');
    }

    // Ensure we're connected
    if (!connectedDevice?.gatt?.connected) {
      await connectToPrinter(savedPrinter.address);
    }

    const commands: number[] = [];
    
    // Initialize
    commands.push(...ESC_POS.INIT);
    
    // Test content
    commands.push(...ESC_POS.ALIGN_CENTER);
    commands.push(...ESC_POS.BOLD_ON);
    commands.push(...textToBytes('================================\n'));
    commands.push(...textToBytes('TEST PRINT\n'));
    commands.push(...textToBytes('================================\n'));
    commands.push(...ESC_POS.BOLD_OFF);
    commands.push(...ESC_POS.ALIGN_LEFT);
    commands.push(...textToBytes(`Printer: ${savedPrinter.name}\n`));
    commands.push(...textToBytes(`Status: Connected\n`));
    commands.push(...textToBytes(`Time: ${new Date().toLocaleTimeString()}\n`));
    commands.push(...ESC_POS.ALIGN_CENTER);
    commands.push(...textToBytes('================================\n'));
    commands.push(...textToBytes('Print test successful!\n'));
    commands.push(...textToBytes('================================\n'));
    commands.push(...ESC_POS.FEED);
    commands.push(...ESC_POS.FEED);
    commands.push(...ESC_POS.FEED);

    const printData = new Uint8Array(commands);

    if (printerCharacteristic) {
      const chunkSize = 20;
      for (let i = 0; i < printData.length; i += chunkSize) {
        const chunk = printData.slice(i, i + chunkSize);
        await printerCharacteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } else {
      console.error('Printer characteristic not available');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error printing test slip:', error);
    throw error;
  }
};

// Get preview text for slip (for UI display)
export const getSlipPreview = (data: CollectionSlipData): string => {
  const sessionLabel = data.session === 'morning' ? 'AM' : 'PM';
  const speciesLabel = data.species === 'cow' ? 'Cow' : data.species === 'buffalo' ? 'Buffalo' : 'Mixed';
  
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
Rate:         Rs.${data.ratePerLiter.toFixed(2)}/L
--------------------------------
TOTAL:        Rs.${data.totalAmount.toFixed(2)}
================================
         Thank you!
================================`;
};
