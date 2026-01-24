/**
 * Property-Based Tests for Network Switch Request
 * 
 * Feature: wallet-integration-frontend, Property 12: Network switch request
 * Validates: Requirements 4.3
 * 
 * Property: For any user action on the network switch prompt, the system should request 
 * MetaMask to switch to the appropriate network
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MetaMaskConnector } from './metamask.service';
import { config } from '@/config';

describe('MetaMaskConnector - Property-Based Tests for Network Switching', () => {
  let connector: MetaMaskConnector;
  let mockEthereum: any;

  beforeEach(() => {
    // Create mock ethereum provider
    mockEthereum = {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      isMetaMask: true,
    };

    // Set up window.ethereum
    (global as any).window = {
      ethereum: mockEthereum,
    };

    connector = new MetaMaskConnector();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 12: Network switch request', () => {
    it('should always request wallet_switchEthereumChain when switching to any supported network', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(config.chains.sepolia.chainId, config.chains.amoy.chainId),
          async (chainId) => {
            // Reset mocks for each iteration
            mockEthereum.request.mockClear();
            
            // Mock successful switch
            mockEthereum.request.mockResolvedValue(null);

            await connector.switchNetwork(chainId);

            // Verify that wallet_switchEthereumChain was called
            expect(mockEthereum.request).toHaveBeenCalledWith({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${chainId.toString(16)}` }],
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should convert any chain ID to correct hex format when requesting switch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(config.chains.sepolia.chainId, config.chains.amoy.chainId),
          async (chainId) => {
            mockEthereum.request.mockClear();
            mockEthereum.request.mockResolvedValue(null);

            await connector.switchNetwork(chainId);

            const expectedHex = `0x${chainId.toString(16)}`;
            expect(mockEthereum.request).toHaveBeenCalledWith(
              expect.objectContaining({
                params: [{ chainId: expectedHex }],
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should attempt to add network when chain is not added (error code 4902)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(config.chains.sepolia.chainId, config.chains.amoy.chainId),
          async (chainId) => {
            mockEthereum.request.mockClear();
            
            // First call fails with 4902, second call (addNetwork) succeeds
            mockEthereum.request
              .mockRejectedValueOnce({ code: 4902 })
              .mockResolvedValueOnce(null);

            await connector.switchNetwork(chainId);

            // Should have been called twice: once for switch, once for add
            expect(mockEthereum.request).toHaveBeenCalledTimes(2);
            
            // First call should be wallet_switchEthereumChain
            expect(mockEthereum.request).toHaveBeenNthCalledWith(1, {
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${chainId.toString(16)}` }],
            });

            // Second call should be wallet_addEthereumChain
            expect(mockEthereum.request).toHaveBeenNthCalledWith(2, {
              method: 'wallet_addEthereumChain',
              params: expect.arrayContaining([
                expect.objectContaining({
                  chainId: `0x${chainId.toString(16)}`,
                }),
              ]),
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include correct network configuration when adding network', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(config.chains.sepolia.chainId, config.chains.amoy.chainId),
          async (chainId) => {
            mockEthereum.request.mockClear();
            
            const chainConfig = chainId === config.chains.sepolia.chainId
              ? config.chains.sepolia
              : config.chains.amoy;

            // Simulate network not added
            mockEthereum.request
              .mockRejectedValueOnce({ code: 4902 })
              .mockResolvedValueOnce(null);

            await connector.switchNetwork(chainId);

            // Verify wallet_addEthereumChain was called with correct config
            expect(mockEthereum.request).toHaveBeenCalledWith({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${chainId.toString(16)}`,
                  chainName: chainConfig.name,
                  nativeCurrency: chainConfig.nativeCurrency,
                  rpcUrls: [chainConfig.rpcUrl],
                  blockExplorerUrls: [chainConfig.explorer],
                },
              ],
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when MetaMask is not installed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(config.chains.sepolia.chainId, config.chains.amoy.chainId),
          async (chainId) => {
            // Remove ethereum from window
            (global as any).window = {};
            const isolatedConnector = new MetaMaskConnector();

            await expect(isolatedConnector.switchNetwork(chainId)).rejects.toThrow(
              'MetaMask is not installed'
            );

            // Restore window.ethereum
            (global as any).window = { ethereum: mockEthereum };
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should propagate errors other than 4902 when switching fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(config.chains.sepolia.chainId, config.chains.amoy.chainId),
          fc.record({
            code: fc.integer({ min: 4000, max: 5000 }).filter(code => code !== 4902),
            message: fc.string(),
          }),
          async (chainId, error) => {
            mockEthereum.request.mockClear();
            mockEthereum.request.mockRejectedValue(error);

            await expect(connector.switchNetwork(chainId)).rejects.toEqual(error);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
