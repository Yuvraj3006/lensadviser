import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, required, className, ...props }, ref) => {
    const selectStyles = clsx(
      'w-full rounded-lg border px-4 py-2.5 pr-10 text-sm transition-colors appearance-none',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      error
        ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-500'
        : 'border-slate-300 bg-white text-slate-900',
      props.disabled && 'opacity-50 cursor-not-allowed bg-slate-100',
      className
    );

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={selectStyles}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option, index) => (
              <option
                key={option.value || `option-${index}`}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <ChevronDown size={18} />
          </div>
        </div>

        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {typeof error === 'string' ? error : typeof error === 'object' && error !== null
              ? (error as any).message || JSON.stringify(error)
              : String(error)}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

