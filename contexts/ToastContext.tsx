'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ToastContainer, ToastProps } from '@/components/ui/Toast';

interface ToastContextValue {
  showToast: (type: ToastProps['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((type: ToastProps['type'], message: string) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: ToastProps = {
      id,
      type,
      message,
      onClose: (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      },
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const handleClose = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={handleClose} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

