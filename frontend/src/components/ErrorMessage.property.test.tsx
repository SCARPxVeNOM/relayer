/**
 * Property-based tests for ErrorMessage component
 * Feature: wallet-integration-frontend
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage - Property Tests', () => {
  /**
   * Property 30: Timeout handling with retry
   * For any network request timeout, the system should display a timeout message and provide a retry option
   * Validates: Requirements 9.2
   */
  it('Property 30: should display retry button for timeout errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Request timeout',
          'Connection timed out',
          'Operation timeout',
          'Network request timed out',
          'Timeout error',
          'Request Timeout',
          'TIMEOUT'
        ),
        (timeoutError) => {
          const onRetry = vi.fn();

          const { unmount } = render(
            <ErrorMessage error={timeoutError} onRetry={onRetry} />
          );

          // Should display error message
          const errorElement = screen.getByTestId('error-message');
          expect(errorElement).toBeInTheDocument();

          // Should display guidance
          const guidance = screen.getByTestId('error-guidance');
          expect(guidance).toBeInTheDocument();
          expect(guidance.textContent).toBeTruthy();

          // Should display retry button for timeout errors
          const retryButton = screen.getByTestId('retry-button');
          expect(retryButton).toBeInTheDocument();

          // Retry button should be clickable
          fireEvent.click(retryButton);
          expect(onRetry).toHaveBeenCalledTimes(1);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30: should call retry callback when retry button is clicked', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'timeout',
          'Request timeout',
          'Connection timed out'
        ),
        fc.integer({ min: 1, max: 5 }),
        (timeoutError, clickCount) => {
          const onRetry = vi.fn();

          const { unmount } = render(
            <ErrorMessage error={timeoutError} onRetry={onRetry} />
          );

          const retryButton = screen.getByTestId('retry-button');

          // Click retry button multiple times
          for (let i = 0; i < clickCount; i++) {
            fireEvent.click(retryButton);
          }

          // Should call retry callback correct number of times
          expect(onRetry).toHaveBeenCalledTimes(clickCount);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 31: Actionable error guidance
   * For any error message displayed, the system should include actionable steps for resolution
   * Validates: Requirements 9.3
   */
  it('Property 31: should always display actionable guidance for any error', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(
            'MetaMask is not installed',
            'Leo Wallet is not installed',
            'Connection rejected',
            'Unsupported network',
            'Transaction failed',
            'Request timeout',
            'Insufficient balance',
            'Invalid address',
            'Unknown error'
          ),
          fc.string({ minLength: 1, maxLength: 100 })
        ),
        (error) => {
          const { unmount } = render(<ErrorMessage error={error} />);

          // Should display error message
          const errorElement = screen.getByTestId('error-message');
          expect(errorElement).toBeInTheDocument();

          // Should display guidance
          const guidance = screen.getByTestId('error-guidance');
          expect(guidance).toBeInTheDocument();

          // Guidance should not be empty
          expect(guidance.textContent).toBeTruthy();
          expect(guidance.textContent!.length).toBeGreaterThan(0);

          // Guidance should contain actionable words
          const guidanceText = guidance.textContent!.toLowerCase();
          const hasActionableWords =
            guidanceText.includes('please') ||
            guidanceText.includes('try') ||
            guidanceText.includes('click') ||
            guidanceText.includes('install') ||
            guidanceText.includes('switch') ||
            guidanceText.includes('check') ||
            guidanceText.includes('contact') ||
            guidanceText.includes('refresh') ||
            guidanceText.includes('add') ||
            guidanceText.includes('reduce') ||
            guidanceText.includes('enter');

          expect(hasActionableWords).toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 31: should provide specific guidance based on error type', () => {
    fc.assert(
      fc.property(
        fc.record({
          error: fc.constantFrom(
            'MetaMask is not installed',
            'Leo Wallet is not installed',
            'Connection rejected',
            'Unsupported network',
            'Request timeout',
            'Insufficient balance',
            'Invalid address'
          ),
        }),
        ({ error }) => {
          const { unmount } = render(<ErrorMessage error={error} />);

          const guidance = screen.getByTestId('error-guidance');
          const guidanceText = guidance.textContent!.toLowerCase();

          // Guidance should be specific to error type
          if (error.includes('not installed')) {
            expect(guidanceText).toContain('install');
          } else if (error.includes('rejected')) {
            expect(guidanceText).toContain('retry');
          } else if (error.includes('timeout')) {
            expect(guidanceText).toContain('try again');
          } else if (error.includes('network')) {
            expect(guidanceText).toContain('switch');
          } else if (error.includes('balance')) {
            expect(guidanceText).toContain('funds');
          } else if (error.includes('address')) {
            expect(guidanceText).toContain('address');
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 31: should not display retry button for non-retryable errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'MetaMask is not installed',
          'Leo Wallet is not installed',
          'Insufficient balance',
          'Invalid address'
        ),
        (nonRetryableError) => {
          const onRetry = vi.fn();

          const { unmount } = render(
            <ErrorMessage error={nonRetryableError} onRetry={onRetry} />
          );

          // Should display error message
          const errorElement = screen.getByTestId('error-message');
          expect(errorElement).toBeInTheDocument();

          // Should NOT display retry button for non-retryable errors
          const retryButton = screen.queryByTestId('retry-button');
          expect(retryButton).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
