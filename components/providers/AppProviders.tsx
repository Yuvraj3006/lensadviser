'use client';

import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PerformanceFix } from '@/components/PerformanceFix';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AppProviders({ children }: { children: React.ReactNode }) {
  // #region agent log
  console.log('[DEBUG] AppProviders rendering', { timestamp: Date.now() });
  // #endregion
  try {
    // #region agent log
    console.log('[DEBUG] AppProviders before return', { timestamp: Date.now() });
    // #endregion
    return (
      <ErrorBoundary>
        <PerformanceFix />
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
    // #region agent log
    console.error('[DEBUG] AppProviders initialization error', { error: error?.message, stack: error?.stack, name: error?.name, timestamp: Date.now() });
    // #endregion
    throw error;
  }
}
