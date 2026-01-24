import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LeoWalletConnector, AleoTransactionParams } from './leo-wallet.service';

describe('Leo Wallet Connector - Unit Tests', () => {
  let connector: LeoWalletConnector;

  beforeEach(() => {
    connector = new LeoWalletConnector();
    delete (window as { leoWallet?: unknown }).leoWallet;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Flow', () => {
    it('should successfully connect to Leo Wallet', async () => {
      const mockAddress = 'aleo1test1234567890123456789012345678901234567890123456789012';

      const connectMock = vi.fn();
      const mockLeoWallet = {
        connect: connectMock,
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      connectMock.mockResolvedValueOnce({ address: mockAddress });

      const result = await connector.connect();

      expect(result.address).toBe(mockAddress);
      expect(result.connected).toBe(true);
      expect(connectMock).toHaveBeenCalled();
    });

    it('should throw error when Leo Wallet is not installed', async () => {
      delete (window as { leoWallet?: unknown }).leoWallet;

      await expect(connector.connect()).rejects.toThrow('Leo Wallet is not installed');
    });

    it('should throw error when user rejects connection', async () => {
      const connectMock = vi.fn();
      const mockLeoWallet = {
        connect: connectMock,
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      connectMock.mockRejectedValueOnce(new Error('User rejected the request'));

      await expect(connector.connect()).rejects.toThrow('Connection rejected by user');
    });

    it('should throw error when no account is returned', async () => {
      const connectMock = vi.fn();
      const mockLeoWallet = {
        connect: connectMock,
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      connectMock.mockResolvedValueOnce({});

      await expect(connector.connect()).rejects.toThrow('No account found');
    });

    it('should disconnect and clean up', async () => {
      const mockAddress = 'aleo1test1234567890123456789012345678901234567890123456789012';
      const connectMock = vi.fn();
      const disconnectMock = vi.fn();
      const removeListenerMock = vi.fn();

      const mockLeoWallet = {
        connect: connectMock,
        disconnect: disconnectMock,
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: removeListenerMock,
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      connectMock.mockResolvedValueOnce({ address: mockAddress });
      disconnectMock.mockResolvedValueOnce(undefined);

      await connector.connect();
      await connector.disconnect();

      expect(disconnectMock).toHaveBeenCalled();
    });
  });

  describe('Account Management', () => {
    it('should get current account', async () => {
      const mockAddress = 'aleo1test1234567890123456789012345678901234567890123456789012';
      const getAccountMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: getAccountMock,
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      getAccountMock.mockResolvedValueOnce(mockAddress);

      const account = await connector.getAccount();

      expect(account).toBe(mockAddress);
      expect(getAccountMock).toHaveBeenCalled();
    });

    it('should return null when no account is connected', async () => {
      const getAccountMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: getAccountMock,
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      getAccountMock.mockResolvedValueOnce(null);

      const account = await connector.getAccount();

      expect(account).toBeNull();
    });

    it('should return null when Leo Wallet is not installed', async () => {
      delete (window as { leoWallet?: unknown }).leoWallet;

      const account = await connector.getAccount();

      expect(account).toBeNull();
    });
  });

  describe('Transaction Submission', () => {
    it('should submit a transaction successfully', async () => {
      const mockTxId = 'at1test1234567890123456789012345678901234567890123456789012';
      const requestTransactionMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: requestTransactionMock,
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      requestTransactionMock.mockResolvedValueOnce(mockTxId);

      const params: AleoTransactionParams = {
        programId: 'privacy_box_mvp.aleo',
        functionName: 'request_transfer',
        inputs: ['100u64', '1u8', 'aleo1recipient'],
        fee: 1000000,
      };

      const txId = await connector.requestTransaction(params);

      expect(txId).toBe(mockTxId);
      expect(requestTransactionMock).toHaveBeenCalledWith(params);
    });

    it('should throw error when Leo Wallet is not installed', async () => {
      delete (window as { leoWallet?: unknown }).leoWallet;

      const params: AleoTransactionParams = {
        programId: 'privacy_box_mvp.aleo',
        functionName: 'request_transfer',
        inputs: ['100u64', '1u8', 'aleo1recipient'],
        fee: 1000000,
      };

      await expect(connector.requestTransaction(params)).rejects.toThrow('Leo Wallet is not installed');
    });

    it('should throw error when user rejects transaction', async () => {
      const requestTransactionMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: requestTransactionMock,
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      requestTransactionMock.mockRejectedValueOnce(new Error('User rejected the transaction'));

      const params: AleoTransactionParams = {
        programId: 'privacy_box_mvp.aleo',
        functionName: 'request_transfer',
        inputs: ['100u64', '1u8', 'aleo1recipient'],
        fee: 1000000,
      };

      await expect(connector.requestTransaction(params)).rejects.toThrow('Transaction rejected by user');
    });

    it('should throw error when insufficient balance', async () => {
      const requestTransactionMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: requestTransactionMock,
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      requestTransactionMock.mockRejectedValueOnce(new Error('Insufficient balance'));

      const params: AleoTransactionParams = {
        programId: 'privacy_box_mvp.aleo',
        functionName: 'request_transfer',
        inputs: ['100u64', '1u8', 'aleo1recipient'],
        fee: 1000000,
      };

      await expect(connector.requestTransaction(params)).rejects.toThrow('Insufficient balance');
    });

    it('should throw error when no transaction ID is returned', async () => {
      const requestTransactionMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: requestTransactionMock,
        getBalance: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      requestTransactionMock.mockResolvedValueOnce('');

      const params: AleoTransactionParams = {
        programId: 'privacy_box_mvp.aleo',
        functionName: 'request_transfer',
        inputs: ['100u64', '1u8', 'aleo1recipient'],
        fee: 1000000,
      };

      await expect(connector.requestTransaction(params)).rejects.toThrow('Transaction failed: No transaction ID returned');
    });
  });

  describe('Transaction Status', () => {
    it('should get transaction status from relayer', async () => {
      const mockTxId = 'at1test1234567890123456789012345678901234567890123456789012';
      const mockResponse = {
        status: 'confirmed',
        publicChainTxHash: '0x1234567890',
        blockHeight: 12345,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const status = await connector.getTransactionStatus(mockTxId);

      expect(status.status).toBe('confirmed');
      expect(status.aleoTxId).toBe(mockTxId);
      expect(status.publicChainTxHash).toBe('0x1234567890');
      expect(status.blockHeight).toBe(12345);
    });

    it('should return pending status when transaction not found (404)', async () => {
      const mockTxId = 'at1test1234567890123456789012345678901234567890123456789012';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const status = await connector.getTransactionStatus(mockTxId);

      expect(status.status).toBe('pending');
      expect(status.aleoTxId).toBe(mockTxId);
    });

    it('should return pending status on fetch error', async () => {
      const mockTxId = 'at1test1234567890123456789012345678901234567890123456789012';

      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const status = await connector.getTransactionStatus(mockTxId);

      expect(status.status).toBe('pending');
      expect(status.aleoTxId).toBe(mockTxId);
    });
  });

  describe('Transaction Monitoring', () => {
    it('should monitor transaction status with polling', async () => {
      vi.useFakeTimers();

      const mockTxId = 'at1test1234567890123456789012345678901234567890123456789012';
      const onStatusChange = vi.fn();

      // First call returns pending, second call returns confirmed
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'pending' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'confirmed', publicChainTxHash: '0x1234' }),
        });

      connector.monitorTransaction(mockTxId, onStatusChange, 1000);

      // Wait for initial poll
      await vi.runOnlyPendingTimersAsync();

      // Wait for second poll
      await vi.advanceTimersByTimeAsync(1000);

      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
          aleoTxId: mockTxId,
        })
      );

      vi.useRealTimers();
    });

    it('should stop monitoring after max attempts', async () => {
      vi.useFakeTimers();

      const mockTxId = 'at1test1234567890123456789012345678901234567890123456789012';
      const onStatusChange = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

      connector.monitorTransaction(mockTxId, onStatusChange, 100, 3);

      // Wait for all polls
      await vi.runOnlyPendingTimersAsync();
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      // Should call with failed status after max attempts
      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Transaction monitoring timeout',
        })
      );

      vi.useRealTimers();
    });
  });

  describe('Balance Fetching', () => {
    it('should get balance for an address', async () => {
      const mockAddress = 'aleo1test1234567890123456789012345678901234567890123456789012';
      const mockBalance = '1000000';
      const getBalanceMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: getBalanceMock,
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      getBalanceMock.mockResolvedValueOnce(mockBalance);

      const balance = await connector.getBalance(mockAddress);

      expect(balance).toBe(mockBalance);
      expect(getBalanceMock).toHaveBeenCalledWith(mockAddress);
    });

    it('should throw error when Leo Wallet is not installed', async () => {
      delete (window as { leoWallet?: unknown }).leoWallet;
      const mockAddress = 'aleo1test1234567890123456789012345678901234567890123456789012';

      await expect(connector.getBalance(mockAddress)).rejects.toThrow('Leo Wallet is not installed');
    });

    it('should throw error when balance fetch fails', async () => {
      const mockAddress = 'aleo1test1234567890123456789012345678901234567890123456789012';
      const getBalanceMock = vi.fn();
      const mockLeoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: getBalanceMock,
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      getBalanceMock.mockRejectedValueOnce(new Error('Failed to fetch balance'));

      await expect(connector.getBalance(mockAddress)).rejects.toThrow('Failed to fetch balance');
    });
  });

  describe('Event Listeners', () => {
    it('should register account change callback', async () => {
      const mockAddress = 'aleo1test1234567890123456789012345678901234567890123456789012';
      const newAddress = 'aleo1new9876543210987654321098765432109876543210987654321098';

      let accountChangedCallback: ((account: string) => void) | null = null;

      const connectMock = vi.fn();
      const mockLeoWallet = {
        connect: connectMock,
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
        on: vi.fn((event: string, callback: (account: string) => void) => {
          if (event === 'accountChanged') {
            accountChangedCallback = callback;
          }
        }),
        removeListener: vi.fn(),
      };

      (window as { leoWallet?: unknown }).leoWallet = mockLeoWallet;
      connectMock.mockResolvedValueOnce({ address: mockAddress });

      await connector.connect();

      const accountChangeCallback = vi.fn();
      connector.onAccountChange(accountChangeCallback);

      // Simulate account change
      if (accountChangedCallback) {
        accountChangedCallback(newAddress);
      }

      expect(accountChangeCallback).toHaveBeenCalledWith(newAddress);
    });
  });

  describe('Installation Check', () => {
    it('should check if Leo Wallet is installed', () => {
      delete (window as { leoWallet?: unknown }).leoWallet;
      expect(connector.isInstalled()).toBe(false);

      (window as { leoWallet?: unknown }).leoWallet = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getAccount: vi.fn(),
        requestTransaction: vi.fn(),
        getBalance: vi.fn(),
      };
      expect(connector.isInstalled()).toBe(true);
    });
  });
});
