'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AdminLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}

