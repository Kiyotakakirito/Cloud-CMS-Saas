// Error boundary component for React error handling

'use client';

import { Component, ReactNode, useState, useEffect } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
              <div className="text-center">
                <div className="text-6xl mb-4">😵</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-600 mb-6">
                  We apologize for the inconvenience. Please try refreshing the page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Hook for error handling
export const useAsyncError = () => {
  const [error, setError] = useState<Error | null>(null);

  const throwError = (error: Error) => {
    setError(error);
  };

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return throwError;
};
