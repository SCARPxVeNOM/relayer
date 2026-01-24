/**
 * Unit tests for error mapping utility
 */

import { describe, it, expect } from 'vitest';
import { mapError, isRetryable, type ErrorInfo } from './error-mapping';

describe('Error Mapping - Unit Tests', () => {
  describe('mapError', () => {
    it('should map MetaMask not installed error', () => {
      const error = 'MetaMask is not installed';
      const result = mapError(error);

      expect(result.userMessage).toBe('MetaMask wallet is not installed');
      expect(result.guidance).toContain('install');
      expect(result.guidance).toContain('MetaMask');
      expect(result.retryable).toBe(false);
    });

    it('should map Leo Wallet not installed error', () => {
      const error = 'Leo Wallet is not installed';
      const result = mapError(error);

      expect(result.userMessage).toBe('Leo Wallet is not installed');
      expect(result.guidance).toContain('install');
      expect(result.guidance).toContain('Leo Wallet');
      expect(result.retryable).toBe(false);
    });

    it('should map connection rejected error', () => {
      const error = 'Connection rejected by user';
      const result = mapError(error);

      expect(result.userMessage).toBe('Wallet connection was rejected');
      expect(result.guidance).toContain('retry');
      expect(result.retryable).toBe(true);
    });

    it('should map unsupported network error', () => {
      const error = 'Unsupported network';
      const result = mapError(error);

      expect(result.userMessage).toBe('Network not supported');
      expect(result.guidance).toContain('switch');
      expect(result.guidance).toContain('Sepolia');
      expect(result.retryable).toBe(true);
    });

    it('should map timeout error', () => {
      const error = 'Request timeout';
      const result = mapError(error);

      expect(result.userMessage).toBe('Request timed out');
      expect(result.guidance).toContain('try again');
      expect(result.retryable).toBe(true);
    });

    it('should map insufficient balance error', () => {
      const error = 'Insufficient balance';
      const result = mapError(error);

      expect(result.userMessage).toBe('Insufficient balance');
      expect(result.guidance).toContain('funds');
      expect(result.retryable).toBe(false);
    });

    it('should map invalid address error', () => {
      const error = 'Invalid address';
      const result = mapError(error);

      expect(result.userMessage).toBe('Invalid recipient address');
      expect(result.guidance).toContain('address');
      expect(result.retryable).toBe(false);
    });

    it('should map transaction rejected error', () => {
      const error = 'Transaction rejected';
      const result = mapError(error);

      expect(result.userMessage).toBe('Transaction was rejected');
      expect(result.guidance).toContain('retry');
      expect(result.retryable).toBe(true);
    });

    it('should map transaction failed error', () => {
      const error = 'Transaction failed';
      const result = mapError(error);

      expect(result.userMessage).toBe('Transaction failed');
      expect(result.guidance).toContain('try again');
      expect(result.retryable).toBe(true);
    });

    it('should map unknown error', () => {
      const error = 'Something weird happened';
      const result = mapError(error);

      expect(result.userMessage).toBe('An unexpected error occurred');
      expect(result.guidance).toContain('try again');
      expect(result.retryable).toBe(true);
    });

    it('should handle Error objects', () => {
      const error = new Error('Request timeout');
      const result = mapError(error);

      expect(result.userMessage).toBe('Request timed out');
      expect(result.retryable).toBe(true);
    });

    it('should handle error objects with message property', () => {
      const error = { message: 'Connection rejected' };
      const result = mapError(error);

      expect(result.userMessage).toBe('Wallet connection was rejected');
      expect(result.retryable).toBe(true);
    });

    it('should handle ethereum not found error as MetaMask not installed', () => {
      const error = 'ethereum not found';
      const result = mapError(error);

      expect(result.userMessage).toBe('MetaMask wallet is not installed');
      expect(result.retryable).toBe(false);
    });

    it('should be case insensitive', () => {
      const error1 = mapError('REQUEST TIMEOUT');
      const error2 = mapError('request timeout');
      const error3 = mapError('Request Timeout');

      expect(error1.userMessage).toBe(error2.userMessage);
      expect(error2.userMessage).toBe(error3.userMessage);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      expect(isRetryable('Connection rejected')).toBe(true);
      expect(isRetryable('Request timeout')).toBe(true);
      expect(isRetryable('Transaction failed')).toBe(true);
      expect(isRetryable('Unsupported network')).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryable('MetaMask is not installed')).toBe(false);
      expect(isRetryable('Leo Wallet is not installed')).toBe(false);
      expect(isRetryable('Insufficient balance')).toBe(false);
      expect(isRetryable('Invalid address')).toBe(false);
    });

    it('should handle Error objects', () => {
      expect(isRetryable(new Error('Request timeout'))).toBe(true);
      expect(isRetryable(new Error('MetaMask is not installed'))).toBe(false);
    });
  });
});
