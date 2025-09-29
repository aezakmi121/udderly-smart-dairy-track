import { useState, useCallback } from 'react';
import { EnhancedToastProps } from '@/components/ui/enhanced-toast';

let toastIdCounter = 0;

export const useEnhancedToast = () => {
  const [toasts, setToasts] = useState<EnhancedToastProps[]>([]);

  const addToast = useCallback((
    toast: Omit<EnhancedToastProps, 'id' | 'onClose'>
  ) => {
    const id = (++toastIdCounter).toString();
    const newToast: EnhancedToastProps = {
      ...toast,
      id,
      onClose: removeToast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    return addToast({ type: 'success', title, description, action });
  }, [addToast]);

  const error = useCallback((title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    return addToast({ type: 'error', title, description, action });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    return addToast({ type: 'warning', title, description, action });
  }, [addToast]);

  const info = useCallback((title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    return addToast({ type: 'info', title, description, action });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};