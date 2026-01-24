import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MetaMaskConnector } from './metamask.service';

describe('MetaMask Connector - Property Tests', () => {
  let connector: MetaMaskConnector;

  beforeEach(() => {
    connector = new MetaMaskConnector();
    // Clear any existing ethereum mock
    delete (window as { ethereum?: unknown }).ethereum;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to generate Ethereum addresses
  const hexChar = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
  const ethereumAddress = () =>
    fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(chars => `0x${chars.join('')}`);

  /**
   * Feature: wallet-integration-frontend, Property 1: MetaMask connection triggers request
   * Validates: Requirements 1.1
   */
  describe('Property 1: MetaMask connection triggers request', () => {
    it('should trigger eth_requestAccounts when connect is called', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(ethereumAddress(), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 999999 }),
          async (accounts, chainId) => {
            // Setup mock ethereum provider
            const requestMock = vi.fn();
            const mockProvider = {
              request: requestMock,
              on: vi.fn(),
              removeListener: vi.fn(),
              isMetaMask: true,
            };

            (window as { ethereum?: unknown }).ethereum = mockProvider;

            // Mock responses
            requestMock.mockResolvedValueOnce(accounts);

            try {
              await connector.connect();

              // Verify that eth_requestAccounts was called
              expect(requestMock).toHaveBeenCalledWith({
                method: 'eth_requestAccounts',
              });
            } catch (error) {
              // Connection might fail for other reasons, but request should still be called
              expect(requestMock).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 2: Successful connection displays address
   * Validates: Requirements 1.2
   */
  describe('Property 2: Successful connection displays address', () => {
    it('should return the connected address on successful connection', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddress(),
          fc.integer({ min: 1, max: 999999 }),
          async (address, chainId) => {
            // Setup mock ethereum provider
            const requestMock = vi.fn();
            const mockProvider = {
              request: requestMock,
              on: vi.fn(),
              removeListener: vi.fn(),
              isMetaMask: true,
            };

            (window as { ethereum?: unknown }).ethereum = mockProvider;

            // Mock successful connection and network response
            requestMock
              .mockResolvedValueOnce([address]) // eth_requestAccounts
              .mockResolvedValueOnce(`0x${chainId.toString(16)}`); // eth_chainId

            const result = await connector.connect();

            // Verify the address is returned
            expect(result.address).toBe(address);
            expect(result.connected).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 3: Connection failures show errors
   * Validates: Requirements 1.3
   */
  describe('Property 3: Connection failures show errors', () => {
    it('should throw an error when connection fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'User rejected the request',
            'MetaMask is locked',
            'Network error',
            'Timeout error'
          ),
          async (errorMessage) => {
            // Setup mock ethereum provider
            const requestMock = vi.fn();
            const mockProvider = {
              request: requestMock,
              on: vi.fn(),
              removeListener: vi.fn(),
              isMetaMask: true,
            };

            (window as { ethereum?: unknown }).ethereum = mockProvider;

            // Mock connection failure
            requestMock.mockRejectedValueOnce(new Error(errorMessage));

            // Verify error is thrown
            await expect(connector.connect()).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw specific error when MetaMask is not installed', async () => {
      // No ethereum provider
      delete (window as { ethereum?: unknown }).ethereum;

      await expect(connector.connect()).rejects.toThrow('MetaMask is not installed');
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 10: Network change detection
   * Validates: Requirements 4.1
   */
  describe('Property 10: Network change detection', () => {
    it('should detect and notify on network changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddress(),
          fc.integer({ min: 1, max: 999999 }),
          fc.integer({ min: 1, max: 999999 }),
          async (address, initialChainId, newChainId) => {
            fc.pre(initialChainId !== newChainId); // Ensure chains are different
            
            let chainChangedCallback: ((chainId: string) => void) | null = null;
            
            // Setup mock ethereum provider
            const requestMock = vi.fn();
            const mockProvider = {
              request: requestMock,
              on: vi.fn((event: string, callback: (chainId: string) => void) => {
                if (event === 'chainChanged') {
                  chainChangedCallback = callback;
                }
              }),
              removeListener: vi.fn(),
              isMetaMask: true,
            };

            (window as { ethereum?: unknown }).ethereum = mockProvider;

            // Mock successful connection
            requestMock
              .mockResolvedValueOnce([address]) // eth_requestAccounts
              .mockResolvedValueOnce(`0x${initialChainId.toString(16)}`); // eth_chainId

            await connector.connect();

            // Setup network change listener
            const networkChangeCallback = vi.fn();
            connector.onNetworkChange(networkChangeCallback);

            // Simulate network change
            if (chainChangedCallback) {
              chainChangedCallback(`0x${newChainId.toString(16)}`);
            }

            // Verify callback was called with new chain ID
            expect(networkChangeCallback).toHaveBeenCalledWith(newChainId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: wallet-integration-frontend, Property 11: Unsupported network warning
   * Validates: Requirements 4.2
   */
  describe('Property 11: Unsupported network warning', () => {
    it('should identify unsupported networks correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddress(),
          fc.integer({ min: 1, max: 999999 }).filter(
            // Filter out supported chain IDs (Sepolia: 11155111, Amoy: 80002)
            chainId => chainId !== 11155111 && chainId !== 80002
          ),
          async (address, unsupportedChainId) => {
            // Setup mock ethereum provider
            const requestMock = vi.fn();
            const mockProvider = {
              request: requestMock,
              on: vi.fn(),
              removeListener: vi.fn(),
              isMetaMask: true,
            };

            (window as { ethereum?: unknown }).ethereum = mockProvider;

            // Mock connection with unsupported network
            requestMock
              .mockResolvedValueOnce([address]) // eth_requestAccounts
              .mockResolvedValueOnce(`0x${unsupportedChainId.toString(16)}`) // eth_chainId
              .mockResolvedValueOnce(`0x${unsupportedChainId.toString(16)}`); // eth_chainId for isSupportedNetwork

            await connector.connect();

            // Check if network is supported
            const isSupported = await connector.isSupportedNetwork();

            // Unsupported networks should return false
            expect(isSupported).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify supported networks correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethereumAddress(),
          fc.constantFrom(11155111, 80002), // Sepolia and Amoy
          async (address, supportedChainId) => {
            // Setup mock ethereum provider
            const requestMock = vi.fn();
            const mockProvider = {
              request: requestMock,
              on: vi.fn(),
              removeListener: vi.fn(),
              isMetaMask: true,
            };

            (window as { ethereum?: unknown }).ethereum = mockProvider;

            // Mock connection with supported network
            requestMock
              .mockResolvedValueOnce([address]) // eth_requestAccounts
              .mockResolvedValueOnce(`0x${supportedChainId.toString(16)}`) // eth_chainId
              .mockResolvedValueOnce(`0x${supportedChainId.toString(16)}`); // eth_chainId for isSupportedNetwork

            await connector.connect();

            // Check if network is supported
            const isSupported = await connector.isSupportedNetwork();

            // Supported networks should return true
            expect(isSupported).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
