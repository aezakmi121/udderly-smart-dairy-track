import { jsPDF } from 'jspdf';

/**
 * Ensure Unicode-safe font is set for jsPDF
 * Uses helvetica which has decent Unicode support in most PDF viewers
 * For production with custom fonts, embed TTF as base64 and use addFileToVFS
 */
export function ensurePdfFont(doc: jsPDF) {
  // Use helvetica which has good Unicode support including ₹
  // For custom fonts, you would:
  // 1. Convert TTF to base64
  // 2. doc.addFileToVFS('Roboto-Regular.ttf', base64String);
  // 3. doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  // 4. doc.setFont('Roboto', 'normal');
  
  doc.setFont('helvetica', 'normal');
}

/**
 * Get font configuration for AutoTable
 */
export function getTableFont() {
  return {
    font: 'helvetica',
    fontSize: 9,
  };
}
