import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EnhancedToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  error: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
  info: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
};

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export const EnhancedToast: React.FC<EnhancedToastProps> = ({
  id,
  type,
  title,
  description,
  onClose,
  action,
}) => {
  const Icon = iconMap[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg',
        colorMap[type]
      )}
    >
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconColorMap[type])} />
      
      <div className="flex-1 space-y-1">
        <div className="font-medium text-sm">{title}</div>
        {description && (
          <div className="text-sm opacity-90">{description}</div>
        )}
        
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium underline hover:no-underline mt-2"
          >
            {action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onClose(id)}
        className="flex h-5 w-5 items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
};

export const EnhancedToastProvider: React.FC<{
  children: React.ReactNode;
  toasts: EnhancedToastProps[];
  onClose: (id: string) => void;
}> = ({ children, toasts, onClose }) => {
  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col-reverse gap-2 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <EnhancedToast key={toast.id} {...toast} onClose={onClose} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};