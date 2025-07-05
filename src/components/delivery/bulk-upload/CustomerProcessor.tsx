
import { CustomerUploadData } from './types';
import { useCustomers } from '@/hooks/useCustomers';

export class CustomerProcessor {
  private customerMutation: any;
  private generateCustomerCode: () => string;

  constructor(customerMutation: any, generateCustomerCode: () => string) {
    this.customerMutation = customerMutation;
    this.generateCustomerCode = generateCustomerCode;
  }

  async processCustomers(customers: CustomerUploadData[]): Promise<{
    successCount: number;
    errorCount: number;
    errors: string[];
  }> {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const customer of customers) {
      console.log('Processing customer:', customer);
      
      try {
        const customerData = {
          customer_code: this.generateCustomerCode(),
          name: customer.name,
          phone_number: customer.phone,
          address: customer.address || '',
          area: null,
          daily_quantity: 0,
          delivery_time: 'morning',
          subscription_type: 'daily',
          rate_per_liter: 50,
          credit_limit: 0,
          is_active: true
        };

        console.log('Saving customer data:', customerData);

        await new Promise((resolve, reject) => {
          this.customerMutation.mutate(
            { customerData, isUpdate: false },
            {
              onSuccess: () => {
                console.log('Successfully added customer:', customer.name);
                successCount++;
                resolve(true);
              },
              onError: (error: any) => {
                console.error('Error adding customer:', customer.name, error);
                const errorMessage = error?.message || error?.details || 'Unknown error';
                errors.push(`${customer.name}: ${errorMessage}`);
                errorCount++;
                reject(error);
              }
            }
          );
        });

        // Add delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error('Failed to process customer:', customer, error);
        const errorMessage = error?.message || error?.details || 'Unknown error';
        errors.push(`${customer.name}: ${errorMessage}`);
        errorCount++;
      }
    }

    return { successCount, errorCount, errors };
  }
}
