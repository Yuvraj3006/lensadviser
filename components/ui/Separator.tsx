'use client';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ className = '', orientation = 'horizontal' }: SeparatorProps) {
  return (
    <div
      className={
        orientation === 'horizontal'
          ? `h-px bg-slate-200 ${className}`
          : `w-px bg-slate-200 ${className}`
      }
    />
  );
}

