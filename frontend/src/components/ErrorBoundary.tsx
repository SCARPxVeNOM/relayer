import * as React from 'react';
import { mapError } from '../utils/error-mapping';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch React errors
 * Provides a fallback UI and error recovery
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      const errorInfo = mapError(this.state.error);

      return (
        <div
          className="error-boundary-container"
          data-testid="error-boundary"
          style={{
            padding: '2rem',
            margin: '2rem',
            border: '2px solid #ef4444',
            borderRadius: '0.5rem',
            backgroundColor: '#fef2f2',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ color: '#dc2626', fontSize: '1.5rem', fontWeight: 'bold' }}>
              Something went wrong
            </h2>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#991b1b', fontWeight: '600' }} data-testid="error-message">
              {errorInfo.userMessage}
            </p>
            <p style={{ color: '#7f1d1d', marginTop: '0.5rem' }} data-testid="error-guidance">
              {errorInfo.guidance}
            </p>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={this.resetError}
              data-testid="reset-button"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Try Again
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', color: '#991b1b' }}>
                Error Details (Development Only)
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#fee2e2',
                  borderRadius: '0.25rem',
                  overflow: 'auto',
                  fontSize: '0.875rem',
                }}
              >
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
