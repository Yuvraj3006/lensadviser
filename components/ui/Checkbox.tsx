'use client';

import { clsx } from 'clsx';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
        checked
          ? 'bg-blue-600 border-blue-600'
          : 'bg-white border-slate-300 hover:border-slate-400',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

