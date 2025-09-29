import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'url' | 'date';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

interface ValidationRequest {
  data: Record<string, any>;
  rules: ValidationRule[];
}

const validateField = (value: any, rule: ValidationRule): string[] => {
  const errors: string[] = [];
  
  // Required check
  if (rule.required && (value === null || value === undefined || value === '')) {
    errors.push(`${rule.field} is required`);
    return errors;
  }
  
  // Skip further validation if field is empty and not required
  if (!rule.required && (value === null || value === undefined || value === '')) {
    return errors;
  }
  
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${rule.field} must be a string`);
        break;
      }
      
      // Length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`);
      }
      
      // Pattern validation
      if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }
      
      // Security checks
      if (/<script|javascript:|data:|vbscript:/i.test(value)) {
        errors.push(`${rule.field} contains potentially dangerous content`);
      }
      break;
      
    case 'number':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        errors.push(`${rule.field} must be a valid number`);
        break;
      }
      
      if (rule.min !== undefined && numValue < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && numValue > rule.max) {
        errors.push(`${rule.field} must not exceed ${rule.max}`);
      }
      break;
      
    case 'email':
      if (typeof value !== 'string') {
        errors.push(`${rule.field} must be a string`);
        break;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${rule.field} must be a valid email address`);
      }
      
      if (value.length > 255) {
        errors.push(`${rule.field} must not exceed 255 characters`);
      }
      break;
      
    case 'url':
      if (typeof value !== 'string') {
        errors.push(`${rule.field} must be a string`);
        break;
      }
      
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(`${rule.field} must use HTTP or HTTPS protocol`);
        }
      } catch {
        errors.push(`${rule.field} must be a valid URL`);
      }
      break;
      
    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        errors.push(`${rule.field} must be a valid date`);
      }
      break;
  }
  
  return errors;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, rules }: ValidationRequest = await req.json();
    
    const allErrors: Record<string, string[]> = {};
    
    // Validate each field
    for (const rule of rules) {
      const fieldValue = data[rule.field];
      const fieldErrors = validateField(fieldValue, rule);
      
      if (fieldErrors.length > 0) {
        allErrors[rule.field] = fieldErrors;
      }
    }
    
    const isValid = Object.keys(allErrors).length === 0;
    
    return new Response(
      JSON.stringify({
        valid: isValid,
        errors: allErrors,
        message: isValid ? 'Validation passed' : 'Validation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isValid ? 200 : 400
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Server validation error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});