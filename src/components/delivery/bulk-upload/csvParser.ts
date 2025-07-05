
import { CustomerUploadData } from './types';

export class CSVParser {
  static parse(text: string): CustomerUploadData[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const customers: CustomerUploadData[] = [];
    
    console.log('Parsing CSV with', lines.length, 'lines');
    
    // Skip header row if it exists
    const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
    console.log('Starting from line index:', startIndex);
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      console.log('Processing line:', line);
      
      // Split by tab first, then by comma if no tabs found
      let values: string[];
      if (line.includes('\t')) {
        values = line.split('\t');
      } else {
        values = line.split(',');
      }
      
      // Clean up values - remove quotes and extra whitespace
      values = values.map(val => val.trim().replace(/^["']|["']$/g, ''));
      
      console.log('Parsed values:', values);
      
      if (values.length >= 2) {
        const customer = {
          name: values[0] || '',
          phone: values[1] || '',
          address: values[2] || ''
        };
        
        // Validate that we have at least name and phone
        if (customer.name && customer.phone) {
          customers.push(customer);
          console.log('Added customer:', customer);
        } else {
          console.log('Skipped invalid customer:', customer);
        }
      } else {
        console.log('Skipped line with insufficient data:', values);
      }
    }
    
    console.log('Total customers parsed:', customers.length);
    return customers;
  }

  static validateFile(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    return fileType === 'text/csv' || 
           fileName.endsWith('.csv') || 
           fileType.includes('spreadsheet') || 
           fileName.endsWith('.xls') || 
           fileName.endsWith('.xlsx');
  }
}
