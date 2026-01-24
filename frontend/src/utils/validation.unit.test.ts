/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateEthereumAddress,
  validateTransferForm,
} from './validation';

describe('Validation - Unit Tests', () => {
  describe('validateAmount', () => {
    it('should accept valid positive numbers', () => {
      expect(validateAmount('1').valid).toBe(true);
      expect(validateAmount('0.5').valid).toBe(true);
      expect(validateAmount('100.25').valid).toBe(true);
      expect(validateAmount('1000000').valid).toBe(true);
    });

    it('should reject zero', () => {
      const result = validateAmount('0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be greater than zero');
    });

    it('should reject negative numbers', () => {
      const result = validateAmount('-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be greater than zero');
    });

    it('should reject non-numeric strings', () => {
      const result = validateAmount('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be a valid number');
    });

    it('should reject empty strings', () => {
      const result = validateAmount('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount is required');
    });

    it('should reject whitespace-only strings', () => {
      const result = validateAmount('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount is required');
    });

    it('should reject infinity', () => {
      const result = validateAmount('Infinity');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be a finite number');
    });
  });

  describe('validateEthereumAddress', () => {
    it('should accept valid Ethereum addresses', () => {
      expect(
        validateEthereumAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0').valid
      ).toBe(true);
      expect(
        validateEthereumAddress('0x0000000000000000000000000000000000000000').valid
      ).toBe(true);
      expect(
        validateEthereumAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF').valid
      ).toBe(true);
    });

    it('should reject addresses without 0x prefix', () => {
      const result = validateEthereumAddress(
        '742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Address must start with 0x');
    });

    it('should reject addresses with incorrect length', () => {
      const result = validateEthereumAddress('0x742d35Cc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        'Address must be 42 characters long (0x + 40 hex characters)'
      );
    });

    it('should reject addresses with non-hex characters', () => {
      const result = validateEthereumAddress(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbG'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Address must contain only hexadecimal characters');
    });

    it('should reject empty addresses', () => {
      const result = validateEthereumAddress('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Address is required');
    });

    it('should reject whitespace-only addresses', () => {
      const result = validateEthereumAddress('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Address is required');
    });
  });

  describe('validateTransferForm', () => {
    it('should validate form with all valid fields', () => {
      const result = validateTransferForm({
        amount: '10',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        destinationChain: 'sepolia',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should invalidate form with invalid amount', () => {
      const result = validateTransferForm({
        amount: '0',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        destinationChain: 'sepolia',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.amount).toBeDefined();
      expect(result.errors.recipientAddress).toBeUndefined();
    });

    it('should invalidate form with invalid address', () => {
      const result = validateTransferForm({
        amount: '10',
        recipientAddress: 'invalid',
        destinationChain: 'amoy',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.recipientAddress).toBeDefined();
      expect(result.errors.amount).toBeUndefined();
    });

    it('should invalidate form with both invalid fields', () => {
      const result = validateTransferForm({
        amount: '-5',
        recipientAddress: 'invalid',
        destinationChain: 'sepolia',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.amount).toBeDefined();
      expect(result.errors.recipientAddress).toBeDefined();
    });

    it('should work with amoy chain', () => {
      const result = validateTransferForm({
        amount: '25.5',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        destinationChain: 'amoy',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});
