import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  variant?: 'solid' | 'outline' | 'soft' | 'success' | 'secondary' | 'warning' | 'danger' | 'info';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple' | 'cyan';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = 'soft',
  color = 'gray',
  size = 'sm',
  children,
  className,
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const variants = {
    solid: {
      blue: 'bg-blue-600 text-white',
      green: 'bg-green-600 text-white',
      red: 'bg-red-600 text-white',
      yellow: 'bg-yellow-600 text-white',
      gray: 'bg-slate-600 text-white',
      purple: 'bg-purple-600 text-white',
      cyan: 'bg-cyan-600 text-white',
    },
    outline: {
      blue: 'border border-blue-600 text-blue-600',
      green: 'border border-green-600 text-green-600',
      red: 'border border-red-600 text-red-600',
      yellow: 'border border-yellow-600 text-yellow-600',
      gray: 'border border-slate-600 text-slate-600',
      purple: 'border border-purple-600 text-purple-600',
      cyan: 'border border-cyan-600 text-cyan-600',
    },
    soft: {
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
      green: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
      red: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
      gray: 'bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-300',
      purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300',
      cyan: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300',
    },
    // Convenience variants
    success: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
    secondary: 'bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
    danger: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
    info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
  };

  // Handle convenience variants (success, secondary, etc.)
  const variantClass = typeof variants[variant] === 'string' 
    ? variants[variant] 
    : variants[variant]?.[color] || variants.soft[color];

  return (
    <span className={clsx(baseStyles, sizes[size], variantClass, className)}>
      {children}
    </span>
  );
}

