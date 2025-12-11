'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // #region agent log
  console.log('[DEBUG] QueryProvider rendering', { timestamp: Date.now() });
  // #endregion
  const [queryClient] = useState(() => {
    // #region agent log
    console.log('[DEBUG] QueryProvider creating QueryClient', { timestamp: Date.now() });
    // #endregion
    try {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      });
      // #region agent log
      console.log('[DEBUG] QueryClient created successfully', { timestamp: Date.now() });
      // #endregion
      return client;
    } catch (error: any) {
      // #region agent log
      console.error('[DEBUG] QueryClient creation failed', { error: error?.message, stack: error?.stack });
      // #endregion
      throw error;
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

