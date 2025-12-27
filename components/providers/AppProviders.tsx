'use client';

import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AppProviders({ children }: { children: React.ReactNode }) {
  try {
    return (
      <ErrorBoundary>
        <QueryProvider>
          <ErrorBoundary>
            <AuthProvider>
              <ErrorBoundary>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </ErrorBoundary>
            </AuthProvider>
          </ErrorBoundary>
        </QueryProvider>
      </ErrorBoundary>
    );
  } catch (error: any) {
    console.error('[AppProviders] Initialization error', { error: error?.message });
    throw error;
  }
}


