import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { LeoWalletConnector } from './leo-wallet.service';

describe('Leo Wallet Connector - Property Tests', () => {
  let connector: LeoWalletConnector;

  beforeEach(() => {
    connector = new LeoWalletConnector();
    // Clear any existing leoWallet mock
    delete (window as { leoWallet?: unknown }).leoWallet;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to generate Aleo addresses (simplified - real Aleo addresses are more complex)
  const aleoAddress = () =>
    fc
      .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), {
        minLength: 63,
        maxLength: 63,
      })
      .map(chars => `aleo1${chars.join('')}`);

  /**
   * Feature: wallet-integration-frontend, Property 4: Leo Wallet connection triggers request
   * Validates: Requirements 2.1
   */
  describe('Property 4: Leo Wallet connection triggers request', () => {
    it('should trigger connect when connect is called', async () => {
      await fc.assert(
        fc.asyncProperty(aleoAddress(), async (address) => {
          // Setup mock Leo Wallet
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

          // Mock successful connection
          connectMock.mockResolvedValueOnce({ address });

          try {
            await connector.connect();

            // Verify that connect was called
            expect(connectMock).toHaveBeenCalled();
          } catch (error) {
            // Connection might fail for other reasons, but connect should still be called
            expect(connectMock).toHaveBeenCalled();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 5: Leo Wallet success displays Aleo address
   * Validates: Requirements 2.2
   */
  describe('Property 5: Leo Wallet success displays Aleo address', () => {
    it('should return the connected Aleo address on successful connection', async () => {
      await fc.assert(
        fc.asyncProperty(aleoAddress(), async (address) => {
          // Setup mock Leo Wallet
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

          // Mock successful connection
          connectMock.mockResolvedValueOnce({ address });

          const result = await connector.connect();

          // Verify the address is returned
          expect(result.address).toBe(address);
          expect(result.connected).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 6: Leo Wallet failures show errors
   * Validates: Requirements 2.3
   */
  describe('Property 6: Leo Wallet failures show errors', () => {
    it('should throw an error when connection fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'User rejected the request',
            'Leo Wallet is locked',
            'Network error',
            'Timeout error'
          ),
          async (errorMessage) => {
            // Setup mock Leo Wallet
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

            // Mock connection failure
            connectMock.mockRejectedValueOnce(new Error(errorMessage));

            // Verify error is thrown
            await expect(connector.connect()).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw specific error when Leo Wallet is not installed', async () => {
      // No leoWallet provider
      delete (window as { leoWallet?: unknown }).leoWallet;

      await expect(connector.connect()).rejects.toThrow('Leo Wallet is not installed');
    });
  });
});
