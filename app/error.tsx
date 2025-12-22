'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-safe-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Something went wrong!
          </h1>
          <p className="text-slate-600">
            An unexpected error occurred. Please try again.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="mb-2 text-sm font-semibold text-red-800">
              Error Details (Development Only):
            </p>
            <pre className="max-h-40 overflow-auto text-xs text-red-700">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            onClick={reset}
            className="flex-1"
          >
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="flex-1"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

