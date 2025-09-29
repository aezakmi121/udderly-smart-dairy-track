import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { formatDate } from '@/lib/dateUtils';

// Apply the autoTable plugin to jsPDF
applyPlugin(jsPDF);

// Extend jsPDF prototype with autoTable
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
  doc.text(`Total Amount: Rs.${data.totalAmount.toFixed(2)}`, 20, 60);
  doc.text(`Average Rate: Rs.${data.avgRate.toFixed(2)}/L`, 20, 70);
  
  // Daily breakdown table
  const tableData = data.dailyData.length > 0 
    ? data.dailyData.map(item => [
        formatDate(item.date),
        item.quantity.toFixed(2),
        `Rs.${item.amount.toFixed(2)}`
      ])
    : [['No data available', '-', '-']];
  
  doc.autoTable({
    startY: 85,
    head: [['Date', 'Quantity (L)', 'Amount (Rs.)']],
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
  const tableData = data.dailyData.length > 0 
    ? data.dailyData.map(item => [
        formatDate(item.date),
        item.quantity.toFixed(2),
        item.avgFat.toFixed(2) + '%',
        item.avgSNF.toFixed(2) + '%'
      ])
    : [['No data available', '-', '-', '-']];
  
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
  doc.text(`Total Amount: Rs.${data.grandTotal.toFixed(2)}`, 20, 60);
  doc.text(`Average Rate: Rs.${avgRate.toFixed(2)}/L`, 20, 70);
  
  // Farmers table
  const tableData = data.farmers.map(farmer => [
    farmer.farmer_code,
    farmer.farmer_name,
    farmer.total_quantity.toFixed(2),
    `Rs.${farmer.total_amount.toFixed(2)}`
  ]);
  
  // Add total row
  tableData.push([
    'TOTAL',
    '',
    data.farmers.reduce((sum, f) => sum + f.total_quantity, 0).toFixed(2),
    `Rs.${data.grandTotal.toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: 85,
    head: [['Farmer Code', 'Name', 'Quantity (L)', 'Amount (Rs.)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [52, 152, 219], fontStyle: 'bold' }
  });
  
  return doc;
};

export const generateExpenseReportPDF = (data: {
  fromDate: string;
  toDate: string;
  totalExpenses: number;
  averagePerMonth: number;
  recordsCount: number;
  categoryBreakdown: Array<{ name: string; amount: number; percentage: number }>;
  monthlyTrends: Array<{ month: string; amount: number }>;
}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Expense Report', 20, 20);
  
  // Date range
  doc.setFontSize(12);
  doc.text(`Period: ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`, 20, 35);
  
  // Summary stats
  doc.text(`Total Expenses: Rs.${data.totalExpenses.toFixed(2)}`, 20, 50);
  doc.text(`Average per Month: Rs.${data.averagePerMonth.toFixed(2)}`, 20, 60);
  doc.text(`Total Records: ${data.recordsCount}`, 20, 70);
  
  // Category breakdown table
  const categoryData = data.categoryBreakdown.length > 0 
    ? data.categoryBreakdown.map(item => [
        item.name,
        `Rs.${item.amount.toFixed(2)}`,
        `${item.percentage.toFixed(1)}%`
      ])
    : [['No data available', '-', '-']];
  
  doc.autoTable({
    startY: 85,
    head: [['Category', 'Amount (Rs.)', 'Percentage']],
    body: categoryData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  // Monthly trends table
  if (data.monthlyTrends.length > 0) {
    const monthlyData = data.monthlyTrends.map(item => [
      item.month,
      `Rs.${item.amount.toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: 150, // Fixed position instead of using lastAutoTable
      head: [['Month', 'Amount (Rs.)']],
      body: monthlyData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  return doc;
};

export const generateWhatsAppMessage = (type: 'collection' | 'production' | 'expenses', data: any) => {
  if (type === 'collection') {
    return `*Milk Collection Report*
📅 Period: ${data.fromDate} to ${data.toDate}

📊 *Summary:*
🥛 Total Quantity: ${data.totalQuantity.toFixed(2)} L
💰 Total Amount: Rs.${data.totalAmount.toFixed(2)}
📈 Average Rate: Rs.${data.avgRate.toFixed(2)}/L

Generated on ${new Date().toLocaleDateString()}`;
  } else if (type === 'production') {
    return `*Milk Production Report*
📅 Period: ${data.fromDate} to ${data.toDate}

📊 *Summary:*
🥛 Total Production: ${data.totalProduction.toFixed(2)} L
📈 Avg Daily Production: ${data.avgProduction.toFixed(2)} L
🧈 Average Fat: ${data.avgFat.toFixed(2)}%
🥛 Average SNF: ${data.avgSNF.toFixed(2)}%

Generated on ${new Date().toLocaleDateString()}`;
  } else {
    const message = `*Expense ${data.reportType || ''} Report*
📅 Period: ${data.fromDate} to ${data.toDate}

📊 *Summary:*
💰 Total Expenses: Rs.${data.totalExpenses.toFixed(2)}
📈 Average per Month: Rs.${data.averagePerMonth.toFixed(2)}
📋 Total Records: ${data.recordsCount}
${data.reportType ? `📊 Type: ${data.reportType}` : ''}

${data.sourceBreakdown ? generateSourceBreakdown(data.sourceBreakdown) : ''}`;
    
    return message;
  }
};

const generateSourceBreakdown = (sourceBreakdown: any[]) => {
  let breakdown = '\n🏢 *Source-wise Breakdown:*\n';
  
  sourceBreakdown.forEach(source => {
    breakdown += `\n📍 *${source.name}* - Rs.${source.amount.toFixed(2)}\n`;
    
    if (source.categories && source.categories.length > 0) {
      source.categories.forEach((category: any) => {
        breakdown += `   • ${category.name}: Rs.${category.amount.toFixed(2)}\n`;
      });
    }
  });
  
  return breakdown;
};

export const generateIndividualFarmerPDF = (data: {
  fromDate: string;
  toDate: string;
  farmer: any;
  transactions: any[];
  totals: {
    quantity: number;
    amount: number;
    avgRate: number;
    avgFat: number;
    avgSNF: number;
    sessions: number;
  };
}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Individual Farmer Payout Report', 105, 20, { align: 'center' });
  
  // Farmer Details
  doc.setFontSize(12);
  doc.text(`Farmer: ${data.farmer?.farmer_code} - ${data.farmer?.name}`, 20, 35);
  doc.text(`Period: ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`, 20, 45);
  
  // Summary Statistics
  doc.setFontSize(14);
  doc.text('Summary', 20, 60);
  doc.setFontSize(10);
  doc.text(`Total Quantity: ${data.totals.quantity} L`, 20, 70);
  doc.text(`Total Amount: Rs.${data.totals.amount}`, 20, 80);
  doc.text(`Average Rate: Rs.${data.totals.avgRate}/L`, 20, 90);
  doc.text(`Average Fat: ${data.totals.avgFat}%`, 100, 70);
  doc.text(`Average SNF: ${data.totals.avgSNF}%`, 100, 80);
  doc.text(`Total Sessions: ${data.totals.sessions}`, 100, 90);
  
  // Transaction Details Table
  const tableData = data.transactions.map(transaction => [
    formatDate(transaction.collection_date),
    transaction.session,
    transaction.species || 'Cow',
    transaction.quantity.toString(),
    transaction.fat_percentage.toString() + '%',
    transaction.snf_percentage.toString() + '%',
    'Rs.' + transaction.rate_per_liter.toString(),
    'Rs.' + transaction.total_amount.toString()
  ]);
  
  doc.autoTable({
    head: [['Date', 'Session', 'Species', 'Qty (L)', 'Fat %', 'SNF %', 'Rate/L', 'Amount']],
    body: tableData,
    startY: 105,
    styles: { fontSize: 8 },
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
      5: { cellWidth: 15 },
      6: { cellWidth: 25 },
      7: { cellWidth: 25 }
    }
  });
  
  // Footer with totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`Grand Total: Rs.${data.totals.amount}`, 20, finalY);
  doc.text(`Total Quantity: ${data.totals.quantity} L`, 120, finalY);
  
  return doc;
};