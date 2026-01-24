/**
 * Property-based tests for error mapping
 * Feature: wallet-integration-frontend, Property 29: User-friendly error messages
 * Validates: Requirements 9.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { mapError, isRetryable, type ErrorInfo } from './error-mapping';

describe('Error Mapping - Property Tests', () => {
  /**
   * Property 29: User-friendly error messages
   * For any wallet operation failure, the system should display a user-friendly error message
   */
  it('Property 29: should always return user-friendly messages for any error', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.record({
            message: fc.string(),
          }),
          fc.constantFrom(
            new Error('MetaMask is not installed'),
            new Error('Leo Wallet is not installed'),
            new Error('Connection rejected by user'),
            new Error('Unsupported network'),
            new Error('Transaction failed'),
            new Error('Request timeout'),
            new Error('Insufficient balance'),
            new Error('Invalid address')
          )
        ),
        (error) => {
          const errorInfo: ErrorInfo = mapError(error);

          // Every error must have a user-friendly message
          expect(errorInfo.userMessage).toBeDefined();
          expect(typeof errorInfo.userMessage).toBe('string');
          expect(errorInfo.userMessage.length).toBeGreaterThan(0);

          // Message should not contain technical jargon or stack traces
          expect(errorInfo.userMessage).not.toMatch(/stack/i);
          expect(errorInfo.userMessage).not.toMatch(/undefined/i);
          expect(errorInfo.userMessage).not.toMatch(/null/i);

          // Every error must have actionable guidance
          expect(errorInfo.guidance).toBeDefined();
          expect(typeof errorInfo.guidance).toBe('string');
          expect(errorInfo.guidance.length).toBeGreaterThan(0);

          // Guidance should be actionable (contain action words)
          const hasActionableWords =
            errorInfo.guidance.toLowerCase().includes('please') ||
            errorInfo.guidance.toLowerCase().includes('try') ||
            errorInfo.guidance.toLowerCase().includes('click') ||
            errorInfo.guidance.toLowerCase().includes('install') ||
            errorInfo.guidance.toLowerCase().includes('switch') ||
            errorInfo.guidance.toLowerCase().includes('check') ||
            errorInfo.guidance.toLowerCase().includes('contact');

          expect(hasActionableWords).toBe(true);

          // Every error must have a retryable flag
          expect(typeof errorInfo.retryable).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29: should map specific error types to appropriate user messages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'MetaMask is not installed',
          'Leo Wallet is not installed',
          'Connection rejected',
          'Unsupported network',
          'Transaction failed',
          'Request timeout',
          'Insufficient balance',
          'Invalid address',
          'ethereum not found'
        ),
        (errorMessage) => {
          const errorInfo = mapError(errorMessage);

          // User message should be different from raw error (more friendly)
          expect(errorInfo.userMessage).toBeDefined();

          // Should not expose raw technical errors
          if (errorMessage.includes('ethereum not found')) {
            expect(errorInfo.userMessage).not.toContain('ethereum not found');
            expect(errorInfo.userMessage.toLowerCase()).toContain('metamask');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29: should provide consistent error info for same error types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'MetaMask is not installed',
          'Connection rejected',
          'Request timeout'
        ),
        (errorMessage) => {
          const errorInfo1 = mapError(errorMessage);
          const errorInfo2 = mapError(errorMessage);

          // Same error should produce same mapping
          expect(errorInfo1.userMessage).toBe(errorInfo2.userMessage);
          expect(errorInfo1.guidance).toBe(errorInfo2.guidance);
          expect(errorInfo1.retryable).toBe(errorInfo2.retryable);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29: isRetryable should return boolean for any error', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.record({ message: fc.string() }),
          fc.constantFrom(
            new Error('test error'),
            'string error',
            { message: 'object error' }
          )
        ),
        (error) => {
          const retryable = isRetryable(error);
          expect(typeof retryable).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });
});
