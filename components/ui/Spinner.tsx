import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <Loader2
      size={sizes[size]}
      className={clsx('animate-spin text-blue-600', className)}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  );
}

