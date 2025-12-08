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
        ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400 focus:ring-red-500'
        : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400',
      icon && 'pl-11',
      props.disabled && 'opacity-50 cursor-not-allowed bg-slate-100',
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
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
          <p id={`${props.id}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${props.id}-hint`} className="mt-1.5 text-sm text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

