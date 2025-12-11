'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error | unknown): State {
    // Ensure we always have an Error object
    if (error instanceof Error) {
      return { hasError: true, error };
    }
    // If it's not an Error, wrap it
    const errorMessage = typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error);
    return { 
      hasError: true, 
      error: new Error(errorMessage) 
    };
  }

  componentDidCatch(error: Error | unknown, errorInfo: any) {
    // Safely log the error
    if (error instanceof Error) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    } else {
      console.error('ErrorBoundary caught a non-Error object:', error, errorInfo);
      // If it's a Zod error or similar, log it properly
      if (error && typeof error === 'object') {
        try {
          console.error('Error object details:', JSON.stringify(error, null, 2));
        } catch (e) {
          console.error('Could not stringify error object');
        }
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
            <h1 className="mb-4 text-2xl font-bold text-slate-900">
              Something went wrong
            </h1>
            {this.state.error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">Error:</p>
                <pre className="mt-2 text-xs text-red-700 overflow-auto">
                  {this.state.error.message || 'An unknown error occurred'}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </div>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
