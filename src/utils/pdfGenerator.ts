import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { formatDate } from '@/lib/dateUtils';

// Re-export new expense report PDF generator
export { 
  generateExpenseReportPDF as generateExpenseReportPDFNew,
  generateExpenseWhatsAppMessage 
} from './expenseReportPDF';

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
  dailyAverage?: number;
  peakDay?: { date: string; quantity: number };
  periodChange?: number;
  sessionBreakdown?: Array<{ session: string; quantity: number; records: number }>;
  topPerformers?: Array<{ cowNumber: string; totalQuantity: number; avgQuantity: number }>;
  bottomPerformers?: Array<{ cowNumber: string; totalQuantity: number; avgQuantity: number }>;
  dailyData: Array<{ date: string; quantity: number; avgFat: number; avgSNF: number }>;
}) => {
  const doc = new jsPDF();
  let yPos = 20;
  
  // Header
  doc.setFontSize(20);
  doc.text('Comprehensive Milk Production Report', 20, yPos);
  yPos += 10;
  
  // Date range
  doc.setFontSize(12);
  doc.text(`Period: ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`, 20, yPos);
  yPos += 15;
  
  // Summary stats
  doc.setFontSize(11);
  doc.text(`Total Production: ${data.totalProduction.toFixed(2)} L`, 20, yPos);
  yPos += 7;
  doc.text(`Daily Average: ${(data.dailyAverage || data.avgProduction).toFixed(2)} L`, 20, yPos);
  yPos += 7;
  
  if (data.periodChange !== undefined) {
    const changeText = data.periodChange >= 0 ? `+${data.periodChange}%` : `${data.periodChange}%`;
    doc.text(`Period Change: ${changeText} vs previous period`, 20, yPos);
    yPos += 7;
  }
  
  if (data.peakDay?.date) {
    doc.text(`Peak Day: ${data.peakDay.quantity.toFixed(2)} L on ${formatDate(data.peakDay.date)}`, 20, yPos);
    yPos += 7;
  }
  
  doc.text(`Average Fat: ${data.avgFat.toFixed(2)}%`, 20, yPos);
  yPos += 7;
  doc.text(`Average SNF: ${data.avgSNF.toFixed(2)}%`, 20, yPos);
  yPos += 15;
  
  // Session breakdown
  if (data.sessionBreakdown && data.sessionBreakdown.length > 0) {
    doc.setFontSize(14);
    doc.text('Session Breakdown', 20, yPos);
    yPos += 5;
    
    const sessionTable = data.sessionBreakdown.map(s => [
      s.session,
      s.quantity.toFixed(2),
      s.records.toString(),
      (s.quantity / s.records).toFixed(2)
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Session', 'Total (L)', 'Records', 'Avg per Record']],
      body: sessionTable,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Top performers
  if (data.topPerformers && data.topPerformers.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Top 5 Performing Cows', 20, yPos);
    yPos += 5;
    
    const topTable = data.topPerformers.map((cow, idx) => [
      `#${idx + 1}`,
      cow.cowNumber,
      cow.totalQuantity.toFixed(2),
      cow.avgQuantity.toFixed(2)
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Rank', 'Cow Number', 'Total (L)', 'Avg/Session']],
      body: topTable,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Bottom performers
  if (data.bottomPerformers && data.bottomPerformers.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Bottom 5 Performers (Need Attention)', 20, yPos);
    yPos += 5;
    
    const bottomTable = data.bottomPerformers.map(cow => [
      cow.cowNumber,
      cow.totalQuantity.toFixed(2),
      cow.avgQuantity.toFixed(2)
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Cow Number', 'Total (L)', 'Avg/Session']],
      body: bottomTable,
      theme: 'grid',
      headStyles: { fillColor: [251, 146, 60] }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Daily breakdown table
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.text('Daily Production Details', 20, yPos);
  yPos += 5;
  
  const tableData = data.dailyData.length > 0 
    ? data.dailyData.map(item => [
        formatDate(item.date),
        item.quantity.toFixed(2),
        item.avgFat.toFixed(2) + '%',
        item.avgSNF.toFixed(2) + '%'
      ])
    : [['No data available', '-', '-', '-']];
  
  doc.autoTable({
    startY: yPos,
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
  reportType?: string;
  totalExpenses: number;
  averagePerMonth: number;
  recordsCount: number;
  categoryBreakdown: Array<{ name: string; amount: number; percentage: number; count: number }>;
  monthlyTrends: Array<{ month: string; amount: number }>;
  transactions?: Array<{
    date: string;
    amount: number;
    category: string;
    source: string;
    paymentMethod: string;
    vendor: string;
    paidBy: string;
    description: string;
    receiptUrl: string | null;
  }>;
}) => {
  const doc = new jsPDF();
  let yPos = 20;
  
  // Header - Page 1: Summary
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Expense Report - Summary', 105, yPos, { align: 'center' });
  yPos += 5;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  if (data.reportType) {
    doc.text(`Report Type: ${data.reportType === 'accrual' ? 'Accrual Accounting' : 'Cashflow Accounting'}`, 105, yPos, { align: 'center' });
    yPos += 5;
  }
  
  doc.text(`Period: ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`, 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Summary stats box
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.rect(15, yPos, 180, 35);
  yPos += 8;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Financial Summary', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Total Expenses: Rs.${data.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, yPos);
  yPos += 7;
  doc.text(`Average per Month: Rs.${data.averagePerMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, yPos);
  yPos += 7;
  doc.text(`Total Transactions: ${data.recordsCount}`, 25, yPos);
  yPos += 15;
  
  // Category breakdown with pie chart
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Category-wise Distribution', 20, yPos);
  yPos += 10;
  
  // Draw pie chart
  if (data.categoryBreakdown.length > 0) {
    const centerX = 60;
    const centerY = yPos + 40;
    const radius = 35;
    const colors = [
      [41, 128, 185],   // Blue
      [231, 76, 60],    // Red
      [46, 204, 113],   // Green
      [241, 196, 15],   // Yellow
      [155, 89, 182],   // Purple
      [230, 126, 34],   // Orange
      [52, 73, 94],     // Dark Blue
      [149, 165, 166]   // Gray
    ];
    
    let startAngle = 0;
    
    data.categoryBreakdown.forEach((item, index) => {
      const angle = (item.percentage / 100) * 2 * Math.PI;
      const color = colors[index % colors.length];
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      
      // Draw pie slice
      doc.circle(centerX, centerY, radius, 'FD');
      const endAngle = startAngle + angle;
      
      // Draw actual slice using lines
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      
      // Create wedge
      doc.setFillColor(color[0], color[1], color[2]);
      const steps = 20;
      const stepAngle = angle / steps;
      doc.moveTo(centerX, centerY);
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + i * stepAngle;
        const x = centerX + radius * Math.cos(a);
        const y = centerY + radius * Math.sin(a);
        if (i === 0) {
          doc.lines([[x - centerX, y - centerY]], centerX, centerY, [1, 1], 'F');
        }
      }
      
      startAngle = endAngle;
    });
    
    // Draw legend on the right
    let legendY = yPos + 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    data.categoryBreakdown.forEach((item, index) => {
      const color = colors[index % colors.length];
      
      // Color box
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(115, legendY - 3, 5, 5, 'F');
      
      // Legend text
      doc.setTextColor(0, 0, 0);
      doc.text(`${item.name}: ${item.percentage.toFixed(1)}% (Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`, 122, legendY);
      legendY += 7;
    });
    
    yPos = Math.max(centerY + radius + 15, legendY + 5);
  }
  
  // Monthly trends table
  if (data.monthlyTrends && data.monthlyTrends.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Monthly Expense Trends', 20, yPos);
    yPos += 5;
    
    const monthlyData = data.monthlyTrends.map(item => [
      item.month,
      `Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Month', 'Amount (Rs.)']],
      body: monthlyData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });
  }
  
  // Category-wise detailed breakdown (New extended report)
  if (data.transactions && data.transactions.length > 0) {
    // Group transactions by category
    const categoryGroups = data.transactions.reduce((acc, txn) => {
      if (!acc[txn.category]) {
        acc[txn.category] = [];
      }
      acc[txn.category].push(txn);
      return acc;
    }, {} as Record<string, typeof data.transactions>);
    
    // Only show categories that have data
    const categoriesWithData = Object.keys(categoryGroups).filter(cat => categoryGroups[cat].length > 0);
    
    categoriesWithData.forEach((category, index) => {
      // Add new page for each category
      doc.addPage();
      yPos = 20;
      
      const categoryTransactions = categoryGroups[category];
      const categoryTotal = categoryTransactions.reduce((sum, txn) => sum + txn.amount, 0);
      const categoryPercentage = (categoryTotal / data.totalExpenses) * 100;
      
      // Category header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text(category, 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Total: Rs.${categoryTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${categoryPercentage.toFixed(1)}% of total expenses | ${categoryTransactions.length} transactions`, 20, yPos);
      yPos += 10;
      
      // Detailed transactions table for this category
      const categoryTableData = categoryTransactions.map(txn => [
        formatDate(txn.date),
        `Rs.${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        txn.source,
        txn.paymentMethod,
        txn.vendor,
        txn.paidBy,
        txn.description.length > 35 ? txn.description.substring(0, 32) + '...' : txn.description,
        '' // Empty for receipt link
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Amount', 'Source', 'Payment', 'Vendor', 'Paid By', 'Description', 'Receipt']],
        body: categoryTableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 25, halign: 'right' },
          2: { cellWidth: 22 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
          6: { cellWidth: 40 },
          7: { cellWidth: 15, halign: 'center' }
        },
        didDrawCell: (cellData: any) => {
          // Add clickable link for receipts
          if (cellData.column.index === 7 && cellData.cell.section === 'body') {
            const receiptUrl = categoryTransactions[cellData.row.index]?.receiptUrl;
            
            if (receiptUrl) {
              const cellCenterY = cellData.cell.y + (cellData.cell.height / 2) + 2;
              doc.setTextColor(0, 0, 255);
              doc.setFontSize(8);
              doc.textWithLink('View', cellData.cell.x + 3, cellCenterY, { url: receiptUrl });
              doc.setTextColor(0, 0, 0);
            }
          }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      // Add source distribution pie chart
      if (yPos < 200) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Source Distribution for ' + category, 20, yPos);
        yPos += 10;
        
        // Calculate source breakdown for this category
        const sourceBreakdown = categoryTransactions.reduce((acc, txn) => {
          if (!acc[txn.source]) {
            acc[txn.source] = 0;
          }
          acc[txn.source] += txn.amount;
          return acc;
        }, {} as Record<string, number>);
        
        const sourceData = Object.entries(sourceBreakdown).map(([source, amount]) => ({
          name: source,
          amount,
          percentage: (amount / categoryTotal) * 100
        }));
        
        // Draw mini pie chart
        const centerX = 50;
        const centerY = yPos + 30;
        const radius = 25;
        const colors = [
          [41, 128, 185],   // Blue
          [231, 76, 60],    // Red
          [46, 204, 113],   // Green
          [241, 196, 15],   // Yellow
          [155, 89, 182]    // Purple
        ];
        
        let startAngle = 0;
        sourceData.forEach((item, index) => {
          const angle = (item.percentage / 100) * 2 * Math.PI;
          const color = colors[index % colors.length];
          
          doc.setFillColor(color[0], color[1], color[2]);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          
          // Draw wedge
          const steps = 15;
          const stepAngle = angle / steps;
          for (let i = 0; i <= steps; i++) {
            const a1 = startAngle + i * stepAngle;
            const a2 = startAngle + (i + 1) * stepAngle;
            const x1 = centerX + radius * Math.cos(a1);
            const y1 = centerY + radius * Math.sin(a1);
            const x2 = centerX + radius * Math.cos(a2);
            const y2 = centerY + radius * Math.sin(a2);
            
            doc.triangle(centerX, centerY, x1, y1, x2, y2, 'FD');
          }
          
          startAngle += angle;
        });
        
        // Legend
        let legendY = yPos + 10;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        
        sourceData.forEach((item, index) => {
          const color = colors[index % colors.length];
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(90, legendY - 3, 4, 4, 'F');
          doc.setTextColor(0, 0, 0);
          doc.text(`${item.name}: ${item.percentage.toFixed(1)}% (Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })})`, 96, legendY);
          legendY += 6;
        });
      }
    });
  }
  
  // Footer
  doc.setFontSize(8);
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Report generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
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

export const generateIndividualCowPerformancePDF = (data: {
  cow: any;
  productionHistory: Array<{ month: string; avgYield: number; totalYield: number }>;
  recentProduction: { last7Days: number; last30Days: number };
  breedingHistory: any[];
  vaccinationHistory: any[];
  weightLogs: any[];
}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Individual Cow Performance Report', 105, 20, { align: 'center' });
  
  // Cow Details
  doc.setFontSize(12);
  doc.text(`Cow Number: ${data.cow.cow_number}`, 20, 35);
  doc.text(`Breed: ${data.cow.breed || 'N/A'}`, 20, 45);
  doc.text(`Status: ${data.cow.status}`, 120, 35);
  doc.text(`Lactation #: ${data.cow.lactation_number || 1}`, 120, 45);
  
  // Performance Metrics
  doc.setFontSize(14);
  doc.text('Performance Metrics', 20, 60);
  doc.setFontSize(10);
  doc.text(`Lifetime Yield: ${Number(data.cow.lifetime_yield || 0).toFixed(2)} L`, 20, 70);
  doc.text(`Current Month: ${Number(data.cow.current_month_yield || 0).toFixed(2)} L`, 20, 80);
  doc.text(`Peak Yield: ${Number(data.cow.peak_yield || 0).toFixed(2)} L`, 20, 90);
  doc.text(`Days in Milk: ${data.cow.daysInMilk || 0}`, 120, 70);
  doc.text(`Avg Daily (7d): ${data.recentProduction.last7Days.toFixed(2)} L`, 120, 80);
  doc.text(`Avg Daily (30d): ${data.recentProduction.last30Days.toFixed(2)} L`, 120, 90);
  
  // Production History Table
  if (data.productionHistory.length > 0) {
    const productionData = data.productionHistory.map(item => [
      item.month,
      item.totalYield.toFixed(2),
      item.avgYield.toFixed(2)
    ]);
    
    doc.autoTable({
      head: [['Month', 'Total Yield (L)', 'Avg Daily (L)']],
      body: productionData,
      startY: 105,
      styles: { fontSize: 9 },
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  // Breeding History
  if (data.breedingHistory.length > 0) {
    const breedingData = data.breedingHistory.slice(0, 5).map(ai => [
      formatDate(ai.ai_date),
      `Service #${ai.service_number}`,
      ai.pd_result || 'Pending',
      ai.technician_name || 'N/A'
    ]);
    
    const startY = data.productionHistory.length > 0 ? (doc as any).lastAutoTable.finalY + 15 : 105;
    doc.setFontSize(12);
    doc.text('Recent AI Services', 20, startY);
    
    doc.autoTable({
      head: [['Date', 'Service', 'Result', 'Technician']],
      body: breedingData,
      startY: startY + 5,
      styles: { fontSize: 9 },
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  // Vaccination History
  if (data.vaccinationHistory.length > 0) {
    const vaccinationData = data.vaccinationHistory.slice(0, 5).map(vax => [
      formatDate(vax.vaccination_date),
      vax.vaccination_schedules?.vaccine_name || 'N/A',
      formatDate(vax.next_due_date),
      vax.batch_number || 'N/A'
    ]);
    
    const startY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.text('Recent Vaccinations', 20, startY);
    
    doc.autoTable({
      head: [['Vaccination Date', 'Vaccine', 'Next Due', 'Batch']],
      body: vaccinationData,
      startY: startY + 5,
      styles: { fontSize: 9 },
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  // Weight Logs
  if (data.weightLogs.length > 0) {
    const weightData = data.weightLogs.slice(0, 5).map(log => [
      formatDate(log.log_date),
      Number(log.calculated_weight).toFixed(2) + ' kg',
      Number(log.heart_girth).toFixed(2) + ' cm',
      Number(log.body_length).toFixed(2) + ' cm'
    ]);
    
    let startY = 105;
    if ((doc as any).lastAutoTable?.finalY) {
      startY = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Check if we need a new page
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }
    
    doc.setFontSize(12);
    doc.text('Weight History', 20, startY);
    
    doc.autoTable({
      head: [['Date', 'Weight', 'Heart Girth', 'Body Length']],
      body: weightData,
      startY: startY + 5,
      styles: { fontSize: 9 },
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  // Footer
  doc.setFontSize(8);
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Report generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
  }
  
  doc.save(`cow_${data.cow.cow_number}_performance_report.pdf`);
};