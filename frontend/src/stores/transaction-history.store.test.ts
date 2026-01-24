import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useTransactionHistoryStore, type Transaction } from './transaction-history.store';

// Helper to generate hex characters
const hexChar = fc.constantFrom(
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f'
);

describe('Transaction History Store - Property Tests', () => {
  beforeEach(() => {
    // Clear the store and localStorage before each test
    useTransactionHistoryStore.getState().clearHistory();
    localStorage.clear();
    // Reset the store to initial state
    useTransactionHistoryStore.setState({ transactions: [] });
  });

  /**
   * Feature: wallet-integration-frontend, Property 22: History entry creation
   * Validates: Requirements 7.1
   * 
   * For any initiated transfer, the system should add an entry to the transaction history list
   */
  it('Property 22: History entry creation', () => {
    fc.assert(
      fc.property(
        // Generate random transaction data
        fc.record({
          id: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          aleoTxId: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          amount: fc.integer({ min: 1, max: 1000000 }).map(n => n.toString()),
          destinationChain: fc.constantFrom(11155111, 80002),
          recipientAddress: fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(arr => `0x${arr.join('')}`),
          status: fc.constantFrom('pending' as const, 'confirmed' as const, 'failed' as const),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
        }),
        (txData: Transaction) => {
          // Clear state before each property run
          useTransactionHistoryStore.setState({ transactions: [] });
          
          const store = useTransactionHistoryStore.getState();
          const initialCount = store.transactions.length;

          // Add transaction
          store.addTransaction(txData);

          // Verify transaction was added
          const newCount = useTransactionHistoryStore.getState().transactions.length;
          expect(newCount).toBe(initialCount + 1);

          // Verify the transaction is in the list
          const addedTx = useTransactionHistoryStore.getState().transactions.find(tx => tx.id === txData.id);
          expect(addedTx).toBeDefined();
          expect(addedTx?.aleoTxId).toBe(txData.aleoTxId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: wallet-integration-frontend, Property 23: History entry completeness
   * Validates: Requirements 7.2
   * 
   * For any transaction in the history, the display should include transaction ID, amount, 
   * destination chain, status, and timestamp
   */
  it('Property 23: History entry completeness', () => {
    fc.assert(
      fc.property(
        // Generate random transaction data
        fc.record({
          id: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          aleoTxId: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          amount: fc.integer({ min: 1, max: 1000000 }).map(n => n.toString()),
          destinationChain: fc.constantFrom(11155111, 80002),
          recipientAddress: fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(arr => `0x${arr.join('')}`),
          status: fc.constantFrom('pending' as const, 'confirmed' as const, 'failed' as const),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
        }),
        (txData: Transaction) => {
          // Clear state before each property run
          useTransactionHistoryStore.setState({ transactions: [] });
          
          const store = useTransactionHistoryStore.getState();

          // Add transaction
          store.addTransaction(txData);

          // Get the added transaction
          const addedTx = useTransactionHistoryStore.getState().transactions.find(tx => tx.id === txData.id);

          // Verify all required fields are present
          expect(addedTx).toBeDefined();
          expect(addedTx?.id).toBeDefined();
          expect(addedTx?.aleoTxId).toBeDefined();
          expect(addedTx?.amount).toBeDefined();
          expect(addedTx?.destinationChain).toBeDefined();
          expect(addedTx?.recipientAddress).toBeDefined();
          expect(addedTx?.status).toBeDefined();
          expect(addedTx?.timestamp).toBeDefined();

          // Verify field values match
          expect(addedTx?.id).toBe(txData.id);
          expect(addedTx?.aleoTxId).toBe(txData.aleoTxId);
          expect(addedTx?.amount).toBe(txData.amount);
          expect(addedTx?.destinationChain).toBe(txData.destinationChain);
          expect(addedTx?.recipientAddress).toBe(txData.recipientAddress);
          expect(addedTx?.status).toBe(txData.status);
          expect(addedTx?.timestamp).toBe(txData.timestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: wallet-integration-frontend, Property 25: Real-time status updates
   * Validates: Requirements 7.4
   * 
   * For any transaction status change, the system should update the status in the transaction history
   */
  it('Property 25: Real-time status updates', () => {
    fc.assert(
      fc.property(
        // Generate random transaction data and status changes
        fc.record({
          id: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          aleoTxId: fc.array(hexChar, { minLength: 60, maxLength: 60 }).map(arr => `at1${arr.join('')}`),
          amount: fc.integer({ min: 1, max: 1000000 }).map(n => n.toString()),
          destinationChain: fc.constantFrom(11155111, 80002),
          recipientAddress: fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(arr => `0x${arr.join('')}`),
          initialStatus: fc.constant('pending' as const),
          newStatus: fc.constantFrom('confirmed' as const, 'failed' as const),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
        }),
        (data) => {
          // Clear state before each property run
          useTransactionHistoryStore.setState({ transactions: [] });
          
          const store = useTransactionHistoryStore.getState();

          // Add transaction with initial status
          const txData: Transaction = {
            id: data.id,
            aleoTxId: data.aleoTxId,
            amount: data.amount,
            destinationChain: data.destinationChain,
            recipientAddress: data.recipientAddress,
            status: data.initialStatus,
            timestamp: data.timestamp,
          };
          store.addTransaction(txData);

          // Verify initial status
          let tx = useTransactionHistoryStore.getState().transactions.find(t => t.aleoTxId === data.aleoTxId);
          expect(tx?.status).toBe(data.initialStatus);

          // Update status
          store.updateTransactionStatus(data.aleoTxId, data.newStatus);

          // Verify status was updated
          tx = useTransactionHistoryStore.getState().transactions.find(t => t.aleoTxId === data.aleoTxId);
          expect(tx?.status).toBe(data.newStatus);
        }
      ),
      { numRuns: 100 }
    );
  });
});
