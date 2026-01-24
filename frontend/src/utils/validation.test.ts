/**
 * Property-based tests for validation utilities
 * Using fast-check for property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateAmount,
  validateEthereumAddress,
  validateTransferForm,
} from './validation';

describe('Validation - Property-Based Tests', () => {
  /**
   * Feature: wallet-integration-frontend, Property 14: Amount validation
   * Validates: Requirements 5.2
   *
   * For any input string, the amount validation should accept only positive numbers
   * and reject zero, negative, or non-numeric values
   */
  describe('Property 14: Amount validation', () => {
    it('should accept positive numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.000001, max: 1e10, noNaN: true }),
          (amount) => {
            const result = validateAmount(amount.toString());
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject zero', () => {
      const result = validateAmount('0');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject negative numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1e10, max: -0.000001, noNaN: true }),
          (amount) => {
            const result = validateAmount(amount.toString());
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-numeric strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => isNaN(Number(s)) && s.trim() !== ''),
          (invalidString) => {
            const result = validateAmount(invalidString);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty strings', () => {
      fc.assert(
        fc.property(fc.constantFrom('', '   ', '\t', '\n'), (emptyString) => {
          const result = validateAmount(emptyString);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject infinity', () => {
      const result = validateAmount('Infinity');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 16: Address format validation
   * Validates: Requirements 5.4
   *
   * For any recipient address input and selected destination chain,
   * the system should validate that the address matches the Ethereum address format
   */
  describe('Property 16: Address format validation', () => {
    // Helper to generate hex strings
    const hexChar = fc.constantFrom(
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'A',
      'B',
      'C',
      'D',
      'E',
      'F'
    );

    it('should accept valid Ethereum addresses', () => {
      fc.assert(
        fc.property(fc.array(hexChar, { minLength: 40, maxLength: 40 }), (hexArray) => {
          const hexString = hexArray.join('');
          const address = '0x' + hexString;
          const result = validateEthereumAddress(address);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject addresses without 0x prefix', () => {
      fc.assert(
        fc.property(fc.array(hexChar, { minLength: 40, maxLength: 40 }), (hexArray) => {
          const hexString = hexArray.join('');
          const result = validateEthereumAddress(hexString);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject addresses with incorrect length', () => {
      fc.assert(
        fc.property(
          fc.array(hexChar, { minLength: 1, maxLength: 100 }).filter((arr) => arr.length !== 40),
          (hexArray) => {
            const hexString = hexArray.join('');
            const address = '0x' + hexString;
            const result = validateEthereumAddress(address);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject addresses with non-hex characters', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 40, maxLength: 40 })
            .filter((s) => !/^[0-9a-fA-F]+$/.test(s)),
          (invalidHex) => {
            const address = '0x' + invalidHex;
            const result = validateEthereumAddress(address);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty addresses', () => {
      fc.assert(
        fc.property(fc.constantFrom('', '   ', '\t'), (emptyString) => {
          const result = validateEthereumAddress(emptyString);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 17: Submit button enablement
   * Validates: Requirements 5.5
   *
   * For any form state where all fields (amount, chain, recipient) are valid,
   * the submit button should be enabled (form validation should pass)
   */
  describe('Property 17: Submit button enablement', () => {
    // Helper to generate hex strings
    const hexChar = fc.constantFrom(
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f'
    );

    it('should validate form as valid when all fields are valid', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.000001, max: 1e10, noNaN: true }),
          fc.array(hexChar, { minLength: 40, maxLength: 40 }),
          fc.constantFrom('sepolia' as const, 'amoy' as const),
          (amount, hexArray, chain) => {
            const hexString = hexArray.join('');
            const formData = {
              amount: amount.toString(),
              recipientAddress: '0x' + hexString,
              destinationChain: chain,
            };
            const result = validateTransferForm(formData);
            expect(result.valid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate form as invalid when amount is invalid', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('0', '-1', 'abc', ''),
          fc.array(hexChar, { minLength: 40, maxLength: 40 }),
          fc.constantFrom('sepolia' as const, 'amoy' as const),
          (invalidAmount, hexArray, chain) => {
            const hexString = hexArray.join('');
            const formData = {
              amount: invalidAmount,
              recipientAddress: '0x' + hexString,
              destinationChain: chain,
            };
            const result = validateTransferForm(formData);
            expect(result.valid).toBe(false);
            expect(result.errors.amount).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate form as invalid when address is invalid', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.000001, max: 1e10, noNaN: true }),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => !s.startsWith('0x') || s.length !== 42),
          fc.constantFrom('sepolia' as const, 'amoy' as const),
          (amount, invalidAddress, chain) => {
            const formData = {
              amount: amount.toString(),
              recipientAddress: invalidAddress,
              destinationChain: chain,
            };
            const result = validateTransferForm(formData);
            expect(result.valid).toBe(false);
            expect(result.errors.recipientAddress).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate form as invalid when both fields are invalid', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('0', '-1', 'abc'),
          fc.string().filter((s) => !s.startsWith('0x') || s.length !== 42),
          fc.constantFrom('sepolia' as const, 'amoy' as const),
          (invalidAmount, invalidAddress, chain) => {
            const formData = {
              amount: invalidAmount,
              recipientAddress: invalidAddress,
              destinationChain: chain,
            };
            const result = validateTransferForm(formData);
            expect(result.valid).toBe(false);
            expect(result.errors.amount).toBeDefined();
            expect(result.errors.recipientAddress).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
