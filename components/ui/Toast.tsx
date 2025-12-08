'use client';

import { useEffect } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-md w-full',
        'animate-in slide-in-from-right duration-300',
        styles[type]
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={iconColors[type]}>{icons[type]}</div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-current opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: ToastProps[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

