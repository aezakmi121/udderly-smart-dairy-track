import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from '@/lib/dateUtils';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateMilkCollectionPDF = (data: {
  fromDate: string;
  toDate: string;
  totalQuantity: number;
  totalAmount: number;
  avgRate: number;
  dailyData: Array<{ date: string; quantity: number; amount: number }>;
}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Milk Collection Report', 20, 20);
  
  // Date range
  doc.setFontSize(12);
  doc.text(`Period: ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`, 20, 35);
  
  // Summary stats
  doc.text(`Total Quantity: ${data.totalQuantity.toFixed(2)} L`, 20, 50);
  doc.text(`Total Amount: ₹${data.totalAmount.toFixed(2)}`, 20, 60);
  doc.text(`Average Rate: ₹${data.avgRate.toFixed(2)}/L`, 20, 70);
  
  // Daily breakdown table
  const tableData = data.dailyData.map(item => [
    formatDate(item.date),
    item.quantity.toFixed(2),
    `₹${item.amount.toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: 85,
    head: [['Date', 'Quantity (L)', 'Amount (₹)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  return doc;
};

export const generateMilkProductionPDF = (data: {
  fromDate: string;
  toDate: string;
  totalProduction: number;
  avgProduction: number;
  avgFat: number;
  avgSNF: number;
  dailyData: Array<{ date: string; quantity: number; avgFat: number; avgSNF: number }>;
}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Milk Production Report', 20, 20);
  
  // Date range
  doc.setFontSize(12);
  doc.text(`Period: ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`, 20, 35);
  
  // Summary stats
  doc.text(`Total Production: ${data.totalProduction.toFixed(2)} L`, 20, 50);
  doc.text(`Average Daily Production: ${data.avgProduction.toFixed(2)} L`, 20, 60);
  doc.text(`Average Fat: ${data.avgFat.toFixed(2)}%`, 20, 70);
  doc.text(`Average SNF: ${data.avgSNF.toFixed(2)}%`, 20, 80);
  
  // Daily breakdown table
  const tableData = data.dailyData.map(item => [
    formatDate(item.date),
    item.quantity.toFixed(2),
    item.avgFat.toFixed(2) + '%',
    item.avgSNF.toFixed(2) + '%'
  ]);
  
  doc.autoTable({
    startY: 95,
    head: [['Date', 'Production (L)', 'Avg Fat (%)', 'Avg SNF (%)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  return doc;
};

export const generatePayoutPDF = (data: {
  fromDate: string;
  toDate: string;
  farmers: Array<{ 
    farmer_code: string; 
    farmer_name: string; 
    total_amount: number; 
    total_quantity: number; 
  }>;
  grandTotal: number;
}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Farmer Payout Report', 20, 20);
  
  // Date range
  doc.setFontSize(12);
  doc.text(`Period: ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`, 20, 35);
  
  // Summary stats
  const totalQuantity = data.farmers.reduce((sum, f) => sum + f.total_quantity, 0);
  const avgRate = totalQuantity > 0 ? data.grandTotal / totalQuantity : 0;
  doc.text(`Total Quantity: ${totalQuantity.toFixed(2)} L`, 20, 50);
  doc.text(`Total Amount: ₹${data.grandTotal.toFixed(2)}`, 20, 60);
  doc.text(`Average Rate: ₹${avgRate.toFixed(2)}/L`, 20, 70);
  
  // Farmers table
  const tableData = data.farmers.map(farmer => [
    farmer.farmer_code,
    farmer.farmer_name,
    farmer.total_quantity.toFixed(2),
    `₹${farmer.total_amount.toFixed(2)}`
  ]);
  
  // Add total row
  tableData.push([
    'TOTAL',
    '',
    data.farmers.reduce((sum, f) => sum + f.total_quantity, 0).toFixed(2),
    `₹${data.grandTotal.toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: 85,
    head: [['Farmer Code', 'Name', 'Quantity (L)', 'Amount (₹)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [52, 152, 219], fontStyle: 'bold' }
  });
  
  return doc;
};

export const generateWhatsAppMessage = (type: 'collection' | 'production', data: any) => {
  if (type === 'collection') {
    return `*Milk Collection Report*
📅 Period: ${data.fromDate} to ${data.toDate}

📊 *Summary:*
🥛 Total Quantity: ${data.totalQuantity.toFixed(2)} L
💰 Total Amount: ₹${data.totalAmount.toFixed(2)}
📈 Average Rate: ₹${data.avgRate.toFixed(2)}/L

Generated on ${new Date().toLocaleDateString()}`;
  } else {
    return `*Milk Production Report*
📅 Period: ${data.fromDate} to ${data.toDate}

📊 *Summary:*
🥛 Total Production: ${data.totalProduction.toFixed(2)} L
📈 Avg Daily Production: ${data.avgProduction.toFixed(2)} L
🧈 Average Fat: ${data.avgFat.toFixed(2)}%
🥛 Average SNF: ${data.avgSNF.toFixed(2)}%

Generated on ${new Date().toLocaleDateString()}`;
  }
};