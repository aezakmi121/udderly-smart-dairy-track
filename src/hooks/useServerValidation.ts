import { useState, useCallback, useRef } from 'react';
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

interface ValidationOptions {
  skipServerValidation?: boolean; // Skip server validation for better performance
  debounceMs?: number; // Debounce validation calls
}

// Simple cache for validation results to reduce server calls
const validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export const useServerValidation = (options: ValidationOptions = {}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const validateData = useCallback(async (
    data: Record<string, any>,
    rules: ValidationRule[]
  ): Promise<ValidationResult> => {
    // Skip server validation if requested (for non-critical forms)
    if (options.skipServerValidation) {
      return { valid: true, errors: {} };
    }

    setIsValidating(true);
    setValidationErrors({});

    // Generate cache key
    const cacheKey = JSON.stringify({ data, rules });
    
    // Check cache first
    const cached = validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setIsValidating(false);
      if (!cached.result.valid) {
        setValidationErrors(cached.result.errors);
      }
      return cached.result;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('validate-input', {
        body: { data, rules }
      });

      if (error) throw error;

      const validationResult = result as ValidationResult;
      
      // Cache the result
      validationCache.set(cacheKey, {
        result: validationResult,
        timestamp: Date.now()
      });

      // Clean old cache entries (keep cache size manageable)
      if (validationCache.size > 50) {
        const oldestKey = Array.from(validationCache.keys())[0];
        validationCache.delete(oldestKey);
      }
      
      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors);
      }

      return validationResult;
    } catch (error) {
      console.error('Server validation error:', error);
      // On server error, allow form submission (fail-open for better UX)
      return {
        valid: true,
        errors: {},
        message: 'Validation service temporarily unavailable'
      };
    } finally {
      setIsValidating(false);
    }
  }, [options.skipServerValidation]);

  const validateDataDebounced = useCallback((
    data: Record<string, any>,
    rules: ValidationRule[],
    callback?: (result: ValidationResult) => void
  ) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const result = await validateData(data, rules);
      callback?.(result);
    }, options.debounceMs || 500);
  }, [validateData, options.debounceMs]);

  const clearErrors = () => {
    setValidationErrors({});
  };

  return {
    validateData,
    validateDataDebounced,
    isValidating,
    validationErrors,
    clearErrors
  };
};
