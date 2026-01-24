/**
 * Unit tests for ErrorBoundary component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ error }: { error: Error }) => {
  throw error;
};

// Component that doesn't throw
const NoError = () => <div data-testid="no-error">No error</div>;

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <NoError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('no-error')).toBeInTheDocument();
  });

  it('should catch errors and display error boundary UI', () => {
    const error = new Error('Test error');

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('should display error message', () => {
    const error = new Error('MetaMask is not installed');

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage.textContent).toBeTruthy();
  });

  it('should display actionable guidance', () => {
    const error = new Error('Connection rejected');

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    const guidance = screen.getByTestId('error-guidance');
    expect(guidance).toBeInTheDocument();
    expect(guidance.textContent).toBeTruthy();
  });

  it('should display reset button', () => {
    const error = new Error('Test error');

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    const resetButton = screen.getByTestId('reset-button');
    expect(resetButton).toBeInTheDocument();
    expect(resetButton.textContent).toBe('Try Again');
  });

  it('should reset error state when reset button is clicked', () => {
    const error = new Error('Test error');
    let shouldThrow = true;

    const ConditionalThrow = () => {
      if (shouldThrow) {
        throw error;
      }
      return <div data-testid="recovered">Recovered</div>;
    };

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    // Error boundary should be displayed
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

    // Stop throwing error
    shouldThrow = false;

    // Click reset button
    const resetButton = screen.getByTestId('reset-button');
    fireEvent.click(resetButton);

    // Should render children again
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    const error = new Error('Test error');
    const customFallback = (err: Error, reset: () => void) => (
      <div data-testid="custom-fallback">
        <p>Custom error: {err.message}</p>
        <button onClick={reset} data-testid="custom-reset">
          Custom Reset
        </button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    expect(screen.getByTestId('custom-reset')).toBeInTheDocument();
  });

  it('should handle different error types', () => {
    const errors = [
      new Error('MetaMask is not installed'),
      new Error('Connection rejected'),
      new Error('Request timeout'),
      new Error('Transaction failed'),
    ];

    errors.forEach((error) => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('error-guidance')).toBeInTheDocument();

      unmount();
    });
  });

  it('should map errors to user-friendly messages', () => {
    const error = new Error('ethereum not found');

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    const errorMessage = screen.getByTestId('error-message');
    // Should map to MetaMask not installed
    expect(errorMessage.textContent).toContain('MetaMask');
  });
});
