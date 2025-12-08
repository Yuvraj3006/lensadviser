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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        localStorage.removeItem('lenstrack_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      localStorage.removeItem('lenstrack_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
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
        
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.code) {
            errorMessage = `Error: ${data.error.code}`;
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        console.error('Login error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          fullResponse: data,
        });
        
        throw new Error(errorMessage);
      }

      if (!data.success || !data.data || !data.data.token) {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('lenstrack_token', data.data.token);
      setUser(data.data.user);
    } catch (error) {
      console.error('Login exception:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during login');
    }
  };

  const logout = () => {
    localStorage.removeItem('lenstrack_token');
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

