import { describe, it, expect, beforeEach } from 'vitest';
import { useTransactionHistoryStore, type Transaction } from './transaction-history.store';

describe('Transaction History Store - Unit Tests', () => {
  beforeEach(() => {
    // Clear the store and localStorage before each test
    useTransactionHistoryStore.getState().clearHistory();
    localStorage.clear();
    useTransactionHistoryStore.setState({ transactions: [] });
  });

  describe('Adding transactions', () => {
    it('should add a transaction to the history', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      store.addTransaction(tx);

      const state = useTransactionHistoryStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0]).toEqual(tx);
    });

    it('should add multiple transactions', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx1: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      const tx2: Transaction = {
        id: 'at1def456',
        aleoTxId: 'at1def456',
        amount: '200',
        destinationChain: 80002,
        recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      store.addTransaction(tx1);
      store.addTransaction(tx2);

      const state = useTransactionHistoryStore.getState();
      expect(state.transactions).toHaveLength(2);
      expect(state.transactions[0]).toEqual(tx2); // Most recent first
      expect(state.transactions[1]).toEqual(tx1);
    });

    it('should add transactions with optional fields', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'confirmed',
        timestamp: Date.now(),
        publicChainTxHash: '0xabc123',
        errorMessage: undefined,
      };

      store.addTransaction(tx);

      const state = useTransactionHistoryStore.getState();
      expect(state.transactions[0].publicChainTxHash).toBe('0xabc123');
    });
  });

  describe('Updating transaction status', () => {
    it('should update transaction status', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      store.addTransaction(tx);
      store.updateTransactionStatus('at1abc123', 'confirmed');

      const state = useTransactionHistoryStore.getState();
      expect(state.transactions[0].status).toBe('confirmed');
    });

    it('should update transaction status with additional fields', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      store.addTransaction(tx);
      store.updateTransactionStatus('at1abc123', 'confirmed', {
        publicChainTxHash: '0xabc123',
      });

      const state = useTransactionHistoryStore.getState();
      expect(state.transactions[0].status).toBe('confirmed');
      expect(state.transactions[0].publicChainTxHash).toBe('0xabc123');
    });

    it('should update transaction status to failed with error message', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      store.addTransaction(tx);
      store.updateTransactionStatus('at1abc123', 'failed', {
        errorMessage: 'Transaction failed on chain',
      });

      const state = useTransactionHistoryStore.getState();
      expect(state.transactions[0].status).toBe('failed');
      expect(state.transactions[0].errorMessage).toBe('Transaction failed on chain');
    });

    it('should not update non-existent transaction', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      store.addTransaction(tx);
      store.updateTransactionStatus('at1nonexistent', 'confirmed');

      const state = useTransactionHistoryStore.getState();
      expect(state.transactions[0].status).toBe('pending'); // Unchanged
    });
  });

  describe('Transaction persistence', () => {
    it('should persist transactions to localStorage', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      store.addTransaction(tx);

      // Check localStorage
      const stored = localStorage.getItem('transaction-history-storage');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.state.transactions).toHaveLength(1);
      expect(parsed.state.transactions[0].id).toBe('at1abc123');
    });
  });

  describe('Clearing history', () => {
    it('should clear all transactions', () => {
      const store = useTransactionHistoryStore.getState();
      
      const tx1: Transaction = {
        id: 'at1abc123',
        aleoTxId: 'at1abc123',
        amount: '100',
        destinationChain: 11155111,
        recipientAddress: '0x1234567890123456789012345678901234567890',
        status: 'pending',
        timestamp: Date.now(),
      };

      const tx2: Transaction = {
        id: 'at1def456',
        aleoTxId: 'at1def456',
        amount: '200',
        destinationChain: 80002,
        recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        status: 'confirmed',
        timestamp: Date.now(),
      };

      store.addTransaction(tx1);
      store.addTransaction(tx2);

      expect(useTransactionHistoryStore.getState().transactions).toHaveLength(2);

      store.clearHistory();

      expect(useTransactionHistoryStore.getState().transactions).toHaveLength(0);
    });
  });
});
