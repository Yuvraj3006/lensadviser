'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserRole } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeId: string | null;
  storeName: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // #region agent log
  console.log('[DEBUG] AuthProvider rendering', { timestamp: Date.now() });
  // #endregion
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      // SECURITY: Token is stored in httpOnly cookie, not localStorage
      // Fetch session using cookie (credentials: 'include' sends cookies automatically)
      const response = await fetch('/api/auth/session', {
        credentials: 'include', // Include httpOnly cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('Session refresh failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession().catch((error) => {
      console.error('Error in refreshSession useEffect:', error);
    });
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different error response formats
        let errorMessage = 'Login failed';

        // Log detailed error information for debugging
        console.error('Login failed:', {
          status: response.status,
          statusText: response.statusText,
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : [],
          error: data?.error,
          message: data?.message,
          success: data?.success,
          fullResponse: data,
        });

        if (data?.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.code) {
            // Special handling for rate limiting
            if (data.error.code === 'RATE_LIMIT_EXCEEDED') {
              errorMessage = `${data.error.message}${data.error.retryAfter ? ` (${data.error.retryAfter}s)` : ''}`;
            } else {
              errorMessage = `Error: ${data.error.code}`;
            }
          }
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait and try again.';
        }

        throw new Error(errorMessage);
      }

      if (!data.success || !data.data || !data.data.user) {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }

      // SECURITY: Token is stored in httpOnly cookie by the server
      // Also store in localStorage for backward compatibility during migration
      // TODO: Remove localStorage storage once all components are migrated to use getTokenForAPI()
      if (data.data.token && typeof window !== 'undefined') {
        localStorage.setItem('lenstrack_token', data.data.token);
      }
      
      setUser(data.data.user);
    } catch (error) {
      console.error('Login exception:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during login');
    }
  };

  const logout = async () => {
    // SECURITY: Clear httpOnly cookie via API
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        console.error('Logout API call failed:', response.statusText);
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    // Clear user state and localStorage token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lenstrack_token');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

