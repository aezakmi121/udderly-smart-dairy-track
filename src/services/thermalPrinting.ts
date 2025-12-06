import { Capacitor } from '@capacitor/core';

// Types for thermal printing
export interface BluetoothDevice {
  name: string;
  address: string;
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

// Check if running on native platform
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
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
};

// Scan for Bluetooth printers (returns discovered devices via callback)
export const scanForPrinters = async (
  onDeviceFound: (devices: BluetoothDevice[]) => void,
  onScanComplete: () => void
): Promise<void> => {
  if (!isNativePlatform()) {
    console.warn('Bluetooth printing is only available on native platforms');
    onScanComplete();
    return;
  }

  try {
    const { CapacitorThermalPrinter } = await import('capacitor-thermal-printer');
    
    // Listen for discovered devices
    await CapacitorThermalPrinter.addListener('discoverDevices', (data) => {
      onDeviceFound(data.devices);
    });

    // Listen for scan completion
    await CapacitorThermalPrinter.addListener('discoveryFinish', () => {
      onScanComplete();
    });

    // Start scanning
    await CapacitorThermalPrinter.startScan();
  } catch (error) {
    console.error('Error scanning for printers:', error);
    onScanComplete();
    throw error;
  }
};

// Stop scanning
export const stopScan = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    const { CapacitorThermalPrinter } = await import('capacitor-thermal-printer');
    await CapacitorThermalPrinter.stopScan();
  } catch (error) {
    console.error('Error stopping scan:', error);
  }
};

// Connect to a specific printer
export const connectToPrinter = async (address: string): Promise<BluetoothDevice | null> => {
  if (!isNativePlatform()) {
    console.warn('Bluetooth printing is only available on native platforms');
    return null;
  }

  try {
    const { CapacitorThermalPrinter } = await import('capacitor-thermal-printer');
    const device = await CapacitorThermalPrinter.connect({ address });
    return device;
  } catch (error) {
    console.error('Error connecting to printer:', error);
    throw error;
  }
};

// Check if connected
export const isConnected = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;

  try {
    const { CapacitorThermalPrinter } = await import('capacitor-thermal-printer');
    return await CapacitorThermalPrinter.isConnected();
  } catch (error) {
    console.error('Error checking connection:', error);
    return false;
  }
};

// Disconnect from printer
export const disconnectPrinter = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    const { CapacitorThermalPrinter } = await import('capacitor-thermal-printer');
    await CapacitorThermalPrinter.disconnect();
  } catch (error) {
    console.error('Error disconnecting printer:', error);
  }
};

// Print collection slip
export const printCollectionSlip = async (data: CollectionSlipData): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.warn('Bluetooth printing is only available on native platforms');
    return false;
  }

  try {
    const { CapacitorThermalPrinter } = await import('capacitor-thermal-printer');
    const savedPrinter = getSavedPrinter();
    
    if (!savedPrinter) {
      throw new Error('No printer configured. Please select a printer in settings.');
    }

    // Connect to printer
    await CapacitorThermalPrinter.connect({ address: savedPrinter.address });

    const sessionLabel = data.session === 'morning' ? 'AM' : 'PM';
    const speciesLabel = data.species === 'cow' ? 'Cow' : data.species === 'buffalo' ? 'Buffalo' : 'Mixed';

    // Build print content using chainable API
    CapacitorThermalPrinter
      .begin()
      .align('center')
      .bold(true)
      .text('================================\n')
      .text('DAIRY COLLECTION SLIP\n')
      .text('================================\n')
      .bold(false)
      .align('left')
      .text(`Date: ${data.date}  Session: ${sessionLabel}\n`)
      .align('center')
      .text('--------------------------------\n')
      .align('left')
      .text(`Farmer: ${data.farmerName}\n`)
      .text(`Code: ${data.farmerCode}\n`)
      .text(`Species: ${speciesLabel}\n`)
      .align('center')
      .text('--------------------------------\n')
      .align('left')
      .text(`Quantity:     ${data.quantity.toFixed(2)} L\n`)
      .text(`Fat:          ${data.fatPercentage.toFixed(1)}%\n`)
      .text(`SNF:          ${data.snfPercentage.toFixed(1)}%\n`)
      .text(`Rate:         Rs.${data.ratePerLiter.toFixed(2)}/L\n`)
      .align('center')
      .text('--------------------------------\n')
      .align('left')
      .bold(true)
      .text(`TOTAL:        Rs.${data.totalAmount.toFixed(2)}\n`)
      .bold(false)
      .align('center')
      .text('================================\n')
      .text('Thank you!\n')
      .text('================================\n')
      .text('\n\n\n');

    await CapacitorThermalPrinter.write();

    // Disconnect after printing
    await CapacitorThermalPrinter.disconnect();

    return true;
  } catch (error) {
    console.error('Error printing slip:', error);
    throw error;
  }
};

// Print a test slip
export const printTestSlip = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.warn('Bluetooth printing is only available on native platforms');
    return false;
  }

  try {
    const { CapacitorThermalPrinter } = await import('capacitor-thermal-printer');
    const savedPrinter = getSavedPrinter();
    
    if (!savedPrinter) {
      throw new Error('No printer configured. Please select a printer in settings.');
    }

    // Connect to printer
    await CapacitorThermalPrinter.connect({ address: savedPrinter.address });

    // Build test print content
    CapacitorThermalPrinter
      .begin()
      .align('center')
      .bold(true)
      .text('================================\n')
      .text('TEST PRINT\n')
      .text('================================\n')
      .bold(false)
      .align('left')
      .text(`Printer: ${savedPrinter.name}\n`)
      .text(`Status: Connected\n`)
      .text(`Time: ${new Date().toLocaleTimeString()}\n`)
      .align('center')
      .text('================================\n')
      .text('Print test successful!\n')
      .text('================================\n')
      .text('\n\n\n');

    await CapacitorThermalPrinter.write();

    // Disconnect after printing
    await CapacitorThermalPrinter.disconnect();

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
