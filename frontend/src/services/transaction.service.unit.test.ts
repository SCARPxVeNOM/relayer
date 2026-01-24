import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transactionService, type TransferRequest } from './transaction.service';
import { leoWalletConnector } from './leo-wallet.service';
import { config } from '@/config';

describe('Transaction Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildTransferParams', () => {
    it('should build correct transaction parameters for Sepolia', () => {
      const request: TransferRequest = {
        amount: '100',
        destinationChain: 'sepolia',
        recipientAddress: '0x1234567890123456789012345678901234567890',
      };

      const params = transactionService.buildTransferParams(request);

      expect(params.programId).toBe(config.aleo.programId);
      expect(params.functionName).toBe('request_transfer');
      expect(params.inputs).toEqual([
        '100',
        config.chains.sepolia.chainId.toString(),
        '0x1234567890123456789012345678901234567890',
      ]);
      expect(params.fee).toBe(1000000);
    });

    it('should build correct transaction parameters for Amoy', () => {
      const request: TransferRequest = {
        amount: '250',
        destinationChain: 'amoy',
        recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const params = transactionService.buildTransferParams(request);

      expect(params.programId).toBe(config.aleo.programId);
      expect(params.functionName).toBe('request_transfer');
      expect(params.inputs).toEqual([
        '250',
        config.chains.amoy.chainId.toString(),
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ]);
      expect(params.fee).toBe(1000000);
    });

    it('should handle large amounts', () => {
      const request: TransferRequest = {
        amount: '999999999',
        destinationChain: 'sepolia',
        recipientAddress: '0x1234567890123456789012345678901234567890',
      };

      const params = transactionService.buildTransferParams(request);

      expect(params.inputs[0]).toBe('999999999');
    });

    it('should handle decimal amounts', () => {
      const request: TransferRequest = {
        amount: '123.456',
        destinationChain: 'amoy',
        recipientAddress: '0x1234567890123456789012345678901234567890',
      };

      const params = transactionService.buildTransferParams(request);

      expect(params.inputs[0]).toBe('123.456');
    });
  });

  describe('submitTransfer', () => {
    it('should submit transfer successfully', async () => {
      const request: TransferRequest = {
        amount: '100',
        destinationChain: 'sepolia',
        recipientAddress: '0x1234567890123456789012345678901234567890',
      };

      const mockTxId = 'at1abc123def456';
      const requestTransactionSpy = vi
        .spyOn(leoWalletConnector, 'requestTransaction')
        .mockResolvedValue(mockTxId);

      const result = await transactionService.submitTransfer(request);

      expect(result.txId).toBe(mockTxId);
      expect(result.status).toBe('pending');
      expect(requestTransactionSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw error when Leo Wallet rejects transaction', async () => {
      const request: TransferRequest = {
        amount: '100',
        destinationChain: 'sepolia',
        recipientAddress: '0x1234567890123456789012345678901234567890',
      };

      vi.spyOn(leoWalletConnector, 'requestTransaction').mockRejectedValue(
        new Error('Transaction rejected by user')
      );

      await expect(transactionService.submitTransfer(request)).rejects.toThrow(
        'Transfer submission failed: Transaction rejected by user'
      );
    });

    it('should throw error when Leo Wallet returns insufficient balance error', async () => {
      const request: TransferRequest = {
        amount: '100',
        destinationChain: 'sepolia',
        recipientAddress: '0x1234567890123456789012345678901234567890',
      };

      vi.spyOn(leoWalletConnector, 'requestTransaction').mockRejectedValue(
        new Error('Insufficient balance')
      );

      await expect(transactionService.submitTransfer(request)).rejects.toThrow(
        'Transfer submission failed: Insufficient balance'
      );
    });

    it('should handle unknown errors', async () => {
      const request: TransferRequest = {
        amount: '100',
        destinationChain: 'sepolia',
        recipientAddress: '0x1234567890123456789012345678901234567890',
      };

      vi.spyOn(leoWalletConnector, 'requestTransaction').mockRejectedValue('Unknown error');

      await expect(transactionService.submitTransfer(request)).rejects.toThrow(
        'Transfer submission failed: Unknown error'
      );
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully', async () => {
      const txId = 'at1abc123def456';
      const mockStatus = {
        status: 'confirmed' as const,
        aleoTxId: txId,
        publicChainTxHash: '0xabc123',
        blockHeight: 12345,
      };

      vi.spyOn(leoWalletConnector, 'getTransactionStatus').mockResolvedValue(mockStatus);

      const result = await transactionService.getTransactionStatus(txId);

      expect(result).toEqual(mockStatus);
    });

    it('should handle pending status', async () => {
      const txId = 'at1abc123def456';
      const mockStatus = {
        status: 'pending' as const,
        aleoTxId: txId,
      };

      vi.spyOn(leoWalletConnector, 'getTransactionStatus').mockResolvedValue(mockStatus);

      const result = await transactionService.getTransactionStatus(txId);

      expect(result.status).toBe('pending');
      expect(result.aleoTxId).toBe(txId);
    });

    it('should handle failed status with error message', async () => {
      const txId = 'at1abc123def456';
      const mockStatus = {
        status: 'failed' as const,
        aleoTxId: txId,
        errorMessage: 'Transaction failed on chain',
      };

      vi.spyOn(leoWalletConnector, 'getTransactionStatus').mockResolvedValue(mockStatus);

      const result = await transactionService.getTransactionStatus(txId);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Transaction failed on chain');
    });
  });

  describe('monitorTransaction', () => {
    it('should start monitoring transaction', () => {
      const txId = 'at1abc123def456';
      const onStatusChange = vi.fn();

      const monitorSpy = vi
        .spyOn(leoWalletConnector, 'monitorTransaction')
        .mockReturnValue(() => {});

      const stopMonitoring = transactionService.monitorTransaction(txId, onStatusChange);

      expect(monitorSpy).toHaveBeenCalledWith(txId, onStatusChange, 5000, 120);
      expect(typeof stopMonitoring).toBe('function');
    });

    it('should use custom poll interval and max attempts', () => {
      const txId = 'at1abc123def456';
      const onStatusChange = vi.fn();

      const monitorSpy = vi
        .spyOn(leoWalletConnector, 'monitorTransaction')
        .mockReturnValue(() => {});

      transactionService.monitorTransaction(txId, onStatusChange, {
        pollInterval: 10000,
        maxAttempts: 60,
      });

      expect(monitorSpy).toHaveBeenCalledWith(txId, onStatusChange, 10000, 60);
    });
  });

  describe('retryGetStatus', () => {
    it('should return status on first attempt', async () => {
      const txId = 'at1abc123def456';
      const mockStatus = {
        status: 'confirmed' as const,
        aleoTxId: txId,
        publicChainTxHash: '0xabc123',
      };

      vi.spyOn(leoWalletConnector, 'getTransactionStatus').mockResolvedValue(mockStatus);

      const result = await transactionService.retryGetStatus(txId);

      expect(result).toEqual(mockStatus);
    });

    it('should retry on failure and succeed', async () => {
      const txId = 'at1abc123def456';
      const mockStatus = {
        status: 'confirmed' as const,
        aleoTxId: txId,
        publicChainTxHash: '0xabc123',
      };

      const getStatusSpy = vi
        .spyOn(leoWalletConnector, 'getTransactionStatus')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockStatus);

      const result = await transactionService.retryGetStatus(txId, 3, 100);

      expect(result).toEqual(mockStatus);
      expect(getStatusSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const txId = 'at1abc123def456';

      vi.spyOn(leoWalletConnector, 'getTransactionStatus').mockRejectedValue(
        new Error('Network error')
      );

      await expect(transactionService.retryGetStatus(txId, 3, 100)).rejects.toThrow(
        'Failed to get transaction status after 3 attempts'
      );
    });

    it('should use exponential backoff', async () => {
      const txId = 'at1abc123def456';
      const mockStatus = {
        status: 'confirmed' as const,
        aleoTxId: txId,
      };

      const getStatusSpy = vi
        .spyOn(leoWalletConnector, 'getTransactionStatus')
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockStatus);

      const startTime = Date.now();
      await transactionService.retryGetStatus(txId, 3, 50);
      const endTime = Date.now();

      // Should have delays: 50ms + 100ms = 150ms minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(getStatusSpy).toHaveBeenCalledTimes(3);
    });
  });
});
