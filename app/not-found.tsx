'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <h1 className="mb-4 text-6xl font-bold text-slate-900">404</h1>
        <h2 className="mb-2 text-2xl font-semibold text-slate-800">
          Page Not Found
        </h2>
        <p className="mb-8 text-slate-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

