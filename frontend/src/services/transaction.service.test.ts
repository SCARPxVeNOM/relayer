import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { transactionService, type TransferRequest } from './transaction.service';
import { leoWalletConnector } from './leo-wallet.service';
import { config } from '@/config';

// Helper to generate hex characters
const hexChar = fc.constantFrom(
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f'
);

describe('Transaction Service - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: wallet-integration-frontend, Property 18: Transfer submission triggers Aleo transaction
   * Validates: Requirements 6.1
   * 
   * For any valid transfer form submission, the system should initiate an Aleo transaction through Leo Wallet
   */
  it('Property 18: Transfer submission triggers Aleo transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid transfer requests
        fc.record({
          amount: fc.integer({ min: 1, max: 1000000 }).map(n => n.toString()),
          destinationChain: fc.constantFrom('sepolia' as const, 'amoy' as const),
          recipientAddress: fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(arr => `0x${arr.join('')}`),
        }),
        async (request: TransferRequest) => {
          // Mock Leo Wallet requestTransaction
          const mockTxIdHex = fc.sample(fc.array(hexChar, { minLength: 60, maxLength: 60 }), 1)[0].join('');
          const mockTxId = `at1${mockTxIdHex}`;
          const requestTransactionSpy = vi.spyOn(leoWalletConnector, 'requestTransaction')
            .mockResolvedValue(mockTxId);

          try {
            // Submit transfer
            const result = await transactionService.submitTransfer(request);

            // Verify that requestTransaction was called
            expect(requestTransactionSpy).toHaveBeenCalledTimes(1);

            // Verify the call was made with correct structure
            const callArgs = requestTransactionSpy.mock.calls[0][0];
            expect(callArgs).toHaveProperty('programId');
            expect(callArgs).toHaveProperty('functionName');
            expect(callArgs).toHaveProperty('inputs');
            expect(callArgs).toHaveProperty('fee');

            // Verify program ID matches config
            expect(callArgs.programId).toBe(config.aleo.programId);

            // Verify function name is correct
            expect(callArgs.functionName).toBe('request_transfer');

            // Verify inputs array has correct length
            expect(callArgs.inputs).toHaveLength(3);

            // Verify result contains transaction ID
            expect(result.txId).toBe(mockTxId);
            expect(result.status).toBe('pending');
          } finally {
            requestTransactionSpy.mockRestore();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: wallet-integration-frontend, Property 19: Pending status display
   * Validates: Requirements 6.2
   * 
   * For any submitted Aleo transaction, the system should display a pending status with the transaction ID
   */
  it('Property 19: Pending status display', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate transaction IDs
        fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
        async (txId: string) => {
          // Mock getTransactionStatus to return pending
          const getStatusSpy = vi.spyOn(leoWalletConnector, 'getTransactionStatus')
            .mockResolvedValue({
              status: 'pending',
              aleoTxId: txId,
            });

          try {
            // Get transaction status
            const status = await transactionService.getTransactionStatus(txId);

            // Verify status is pending
            expect(status.status).toBe('pending');

            // Verify transaction ID is included
            expect(status.aleoTxId).toBe(txId);
          } finally {
            getStatusSpy.mockRestore();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: wallet-integration-frontend, Property 20: Confirmation status update
   * Validates: Requirements 6.3
   * 
   * For any confirmed Aleo transaction, the system should update the status to confirmed and display the transaction hash
   */
  it('Property 20: Confirmation status update', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate transaction data
        fc.record({
          aleoTxId: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          publicChainTxHash: fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(arr => `0x${arr.join('')}`),
          blockHeight: fc.integer({ min: 1, max: 1000000 }),
        }),
        async (txData) => {
          // Mock getTransactionStatus to return confirmed
          const getStatusSpy = vi.spyOn(leoWalletConnector, 'getTransactionStatus')
            .mockResolvedValue({
              status: 'confirmed',
              aleoTxId: txData.aleoTxId,
              publicChainTxHash: txData.publicChainTxHash,
              blockHeight: txData.blockHeight,
            });

          try {
            // Get transaction status
            const status = await transactionService.getTransactionStatus(txData.aleoTxId);

            // Verify status is confirmed
            expect(status.status).toBe('confirmed');

            // Verify transaction ID is included
            expect(status.aleoTxId).toBe(txData.aleoTxId);

            // Verify public chain transaction hash is included
            expect(status.publicChainTxHash).toBe(txData.publicChainTxHash);

            // Verify block height is included
            expect(status.blockHeight).toBe(txData.blockHeight);
          } finally {
            getStatusSpy.mockRestore();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: wallet-integration-frontend, Property 21: Transaction failure handling
   * Validates: Requirements 6.4
   * 
   * For any failed Aleo transaction, the system should display an error message with failure details
   */
  it('Property 21: Transaction failure handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate transaction failure data
        fc.record({
          aleoTxId: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          errorMessage: fc.constantFrom(
            'Insufficient balance',
            'Transaction rejected by user',
            'Network error',
            'Invalid transaction parameters',
            'Transaction timeout'
          ),
        }),
        async (txData) => {
          // Mock getTransactionStatus to return failed
          const getStatusSpy = vi.spyOn(leoWalletConnector, 'getTransactionStatus')
            .mockResolvedValue({
              status: 'failed',
              aleoTxId: txData.aleoTxId,
              errorMessage: txData.errorMessage,
            });

          try {
            // Get transaction status
            const status = await transactionService.getTransactionStatus(txData.aleoTxId);

            // Verify status is failed
            expect(status.status).toBe('failed');

            // Verify transaction ID is included
            expect(status.aleoTxId).toBe(txData.aleoTxId);

            // Verify error message is included
            expect(status.errorMessage).toBe(txData.errorMessage);
            expect(status.errorMessage).toBeTruthy();
          } finally {
            getStatusSpy.mockRestore();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
