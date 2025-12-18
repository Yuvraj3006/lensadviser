import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  multiline?: boolean;
  rows?: number;
}

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ label, error, hint, icon, required, multiline, rows = 3, className, value, onChange, ...props }, ref) => {
    const inputStyles = clsx(
      'w-full rounded-lg border px-4 py-2.5 text-sm transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      error
        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 placeholder-red-400 dark:placeholder-red-500 focus:ring-red-500'
        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500',
      icon && 'pl-11',
      props.disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800',
      // Allow className to override default styles
      className
    );

    const Element = multiline ? 'textarea' : 'input';
    
    // Handle NaN values for number inputs - convert to empty string
    const safeValue = props.type === 'number' && (typeof value === 'number' && isNaN(value))
      ? ''
      : value;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {icon}
            </div>
          )}
          
          <Element
            ref={ref as any}
            className={inputStyles}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
            rows={multiline ? rows : undefined}
            value={safeValue ?? ''}
            onChange={onChange}
            style={{
              ...(className?.includes('text-white') ? { color: 'white' } : {}),
              ...(className?.includes('bg-slate-700') ? { backgroundColor: 'rgba(51, 65, 85, 0.8)' } : {}),
              ...(props.style || {}),
            }}
            {...(props as any)}
          />
        </div>

        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {typeof error === 'string' ? error : typeof error === 'object' && error !== null
              ? (error as any).message || JSON.stringify(error)
              : String(error)}
          </p>
        )}

        {hint && !error && (
          <p id={`${props.id}-hint`} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

