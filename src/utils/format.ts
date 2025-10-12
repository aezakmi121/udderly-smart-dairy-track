import { format, parse } from 'date-fns';

/**
 * Format number as Indian Rupee currency
 */
export const inr = (num: number): string => {
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format number as Indian Rupee without decimals
 */
export const inrShort = (num: number): string => {
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

/**
 * Format date string (YYYY-MM-DD) to dd-MM-yyyy
 */
export const fmtDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return format(date, 'dd-MM-yyyy');
  } catch {
    return dateStr;
  }
};

/**
 * Format month string (YYYY-MM) to MMM yyyy
 */
export const fmtMonth = (monthStr: string): string => {
  if (!monthStr) return 'N/A';
  try {
    // Parse YYYY-MM format
    const date = parse(monthStr + '-01', 'yyyy-MM-dd', new Date());
    return format(date, 'MMM yyyy');
  } catch {
    return monthStr;
  }
};

/**
 * Prepare category data by merging small categories into "Others"
 * and normalizing percentages to sum to 100%
 */
export const prepCategoryData = (
  categories: Array<{ name: string; amount: number; percentage?: number }>,
  options: { othersThresholdPct?: number } = {}
): Array<{ name: string; amount: number; percentage: number }> => {
  const { othersThresholdPct = 2 } = options;
  
  if (!categories || categories.length === 0) return [];
  
  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
  if (total === 0) return [];
  
  // Calculate percentages
  const withPercentages = categories.map(cat => ({
    ...cat,
    percentage: (cat.amount / total) * 100
  }));
  
  // Separate large and small categories
  const largeCats: typeof withPercentages = [];
  let othersAmount = 0;
  
  withPercentages.forEach(cat => {
    if (cat.percentage >= othersThresholdPct) {
      largeCats.push(cat);
    } else {
      othersAmount += cat.amount;
    }
  });
  
  // Add "Others" if there are small categories
  const result = [...largeCats];
  if (othersAmount > 0) {
    result.push({
      name: 'Others',
      amount: othersAmount,
      percentage: (othersAmount / total) * 100
    });
  }
  
  // Normalize percentages to sum to exactly 100%
  const totalPercentage = result.reduce((sum, cat) => sum + cat.percentage, 0);
  if (totalPercentage !== 100 && totalPercentage > 0) {
    const factor = 100 / totalPercentage;
    result.forEach(cat => {
      cat.percentage = cat.percentage * factor;
    });
  }
  
  return result.sort((a, b) => b.amount - a.amount);
};
