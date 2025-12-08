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
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      gray: 'bg-slate-100 text-slate-800',
      purple: 'bg-purple-100 text-purple-800',
      cyan: 'bg-cyan-100 text-cyan-800',
    },
    // Convenience variants
    success: 'bg-green-100 text-green-800',
    secondary: 'bg-slate-100 text-slate-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
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

