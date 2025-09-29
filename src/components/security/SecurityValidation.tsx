import React from 'react';
import { z } from 'zod';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

// Enhanced validation schemas with security focus
export const secureEmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .email('Invalid email format')
  .refine(
    (email) => !email.includes('<') && !email.includes('>'),
    'Email contains invalid characters'
  );

export const securePasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    'Password cannot contain repeated characters'
  );

export const secureTextSchema = z
  .string()
  .trim()
  .max(1000, 'Text must be less than 1000 characters')
  .refine(
    (text) => !/<script|javascript:|data:|vbscript:/i.test(text),
    'Text contains potentially dangerous content'
  );

export const secureNumberSchema = z
  .number()
  .min(0, 'Value must be positive')
  .max(999999999, 'Value exceeds maximum limit')
  .finite('Value must be a valid number');

export const secureUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsedUrl = new URL(url);
        return ['http:', 'https:'].includes(parsedUrl.protocol);
      } catch {
        return false;
      }
    },
    'URL must use HTTP or HTTPS protocol'
  );

// Security validation component
interface SecurityValidationProps {
  schema: z.ZodSchema;
  value: any;
  showIcon?: boolean;
}

export const SecurityValidation: React.FC<SecurityValidationProps> = ({
  schema,
  value,
  showIcon = true,
}) => {
  const result = schema.safeParse(value);
  
  if (!value) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      {showIcon && (
        result.success ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )
      )}
      <span className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
        {result.success ? 'Valid' : result.error.errors[0]?.message}
      </span>
    </div>
  );
};

// Server-side validation wrapper
export const validateOnServer = async (schema: z.ZodSchema, data: any) => {
  try {
    const result = await schema.parseAsync(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Validation failed' }],
    };
  }
};

// CSP helpers
export const generateCSPNonce = () => {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
};

export const sanitizeHtml = (html: string) => {
  // Basic HTML sanitization (in production, use DOMPurify)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};