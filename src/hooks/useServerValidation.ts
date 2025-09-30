import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'url' | 'date';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  message?: string;
}

export const useServerValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateData = async (
    data: Record<string, any>,
    rules: ValidationRule[]
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    setValidationErrors({});

    try {
      const { data: result, error } = await supabase.functions.invoke('validate-input', {
        body: { data, rules }
      });

      if (error) throw error;

      const validationResult = result as ValidationResult;
      
      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors);
      }

      return validationResult;
    } catch (error) {
      console.error('Server validation error:', error);
      return {
        valid: false,
        errors: { general: ['Server validation failed. Please try again.'] },
        message: 'Validation error'
      };
    } finally {
      setIsValidating(false);
    }
  };

  const clearErrors = () => {
    setValidationErrors({});
  };

  return {
    validateData,
    isValidating,
    validationErrors,
    clearErrors
  };
};
