import React, { useState, useCallback } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Form } from '@/components/ui/form';
import { AnimatedButton } from '@/components/ui/animated-button';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { supabase } from '@/integrations/supabase/client';

interface SmartFormProps<T extends z.ZodSchema> {
  schema: T;
  onSubmit: (data: z.infer<T>) => Promise<void> | void;
  defaultValues?: any;
  children: (form: UseFormReturn<z.infer<T>>) => React.ReactNode;
  className?: string;
  validateOnServer?: boolean;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  showProgress?: boolean;
}

export function SmartForm<T extends z.ZodSchema>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  validateOnServer = true,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onCancel,
  showProgress = false,
}: SmartFormProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const { error: showError, success: showSuccess } = useEnhancedToast();

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const validateOnServerSide = useCallback(async (data: z.infer<T>) => {
    if (!validateOnServer) return { valid: true };

    try {
      // Create validation rules from schema
      const rules = Object.keys(data).map(field => ({
        field,
        type: 'string' as const, // Simplified for demo
        required: true,
        maxLength: 1000,
      }));

      const { data: result } = await supabase.functions.invoke('validate-input', {
        body: { data, rules }
      });

      return result;
    } catch (error) {
      console.error('Server validation error:', error);
      return { valid: false, errors: { general: ['Server validation failed'] } };
    }
  }, [validateOnServer]);

  const handleSubmit = async (data: z.infer<T>) => {
    setIsSubmitting(true);
    setServerErrors({});

    try {
      // Server-side validation
      if (validateOnServer) {
        const serverValidation = await validateOnServerSide(data);
        if (!serverValidation.valid) {
          const errors: Record<string, string> = {};
          if (serverValidation.errors) {
            Object.entries(serverValidation.errors).forEach(([field, messages]) => {
              errors[field] = Array.isArray(messages) ? messages[0] : messages;
            });
          }
          setServerErrors(errors);
          showError('Validation Error', 'Please correct the highlighted fields');
          return;
        }
      }

      await onSubmit(data);
      showSuccess('Success', 'Form submitted successfully');
      form.reset();
    } catch (error) {
      console.error('Form submission error:', error);
      showError('Error', 'Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formProgress = Object.keys(form.getValues()).length > 0 
    ? (Object.values(form.getValues()).filter(Boolean).length / Object.keys(form.getValues()).length) * 100 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Form Progress</span>
                <span>{Math.round(formProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${formProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {children(form)}

          <AnimatePresence>
            {Object.keys(serverErrors).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {Object.entries(serverErrors).map(([field, message]) => (
                  <p key={field} className="text-sm text-destructive">
                    {field}: {message}
                  </p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 justify-end">
            {onCancel && (
              <AnimatedButton
                type="button"
                variant="outline"
                onClick={onCancel}
                animation="bounce"
              >
                {cancelText}
              </AnimatedButton>
            )}
            
            <AnimatedButton
              type="submit"
              loading={isSubmitting}
              disabled={!form.formState.isValid}
              animation="glow"
              haptic={true}
            >
              {submitText}
            </AnimatedButton>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}