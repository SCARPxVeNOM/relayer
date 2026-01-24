import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useWalletStore } from './wallet.store';
import { metamaskConnector } from '@/services/metamask.service';
import { leoWalletConnector } from '@/services/leo-wallet.service';

// Mock the wallet connectors
vi.mock('@/services/metamask.service', () => ({
  metamaskConnector: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getBalance: vi.fn(),
    onAccountChange: vi.fn(),
    onNetworkChange: vi.fn(),
  },
}));

vi.mock('@/services/leo-wallet.service', () => ({
  leoWalletConnector: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getBalance: vi.fn(),
    onAccountChange: vi.fn(),
  },
}));

describe('Wallet Store - Property Tests', () => {
  // Helper to generate Ethereum addresses
  const hexChar = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
  const ethereumAddress = () =>
    fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(chars => `0x${chars.join('')}`);

  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useWalletStore());
    act(() => {
      result.current.disconnectMetaMask();
      result.current.disconnectLeoWallet();
    });
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
  });

  /**
   * Feature: wallet-integration-frontend, Property 7: Dual wallet display
   * Validates: Requirements 3.1
   * 
   * For any pair of connected wallets (MetaMask and Leo), the system should 
   * display both addresses simultaneously
   */
  it('Property 7: should display both wallet addresses when both are connected', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddress(), // MetaMask address
        fc.integer({ min: 1, max: 999999 }), // Chain ID
        fc.string({ minLength: 30, maxLength: 63 }), // Leo Wallet address (Aleo format)
        async (metamaskAddr, chainId, leoAddr) => {
          // Setup mocks
          vi.mocked(metamaskConnector.connect).mockResolvedValue({
            address: metamaskAddr,
            chainId,
            connected: true,
          });
          vi.mocked(metamaskConnector.getBalance).mockResolvedValue('1.0');
          
          vi.mocked(leoWalletConnector.connect).mockResolvedValue({
            address: leoAddr,
            connected: true,
          });
          vi.mocked(leoWalletConnector.getBalance).mockResolvedValue('100.0');

          const { result } = renderHook(() => useWalletStore());

          // Connect both wallets
          await act(async () => {
            await result.current.connectMetaMask();
          });

          await act(async () => {
            await result.current.connectLeoWallet();
          });

          // Both addresses should be displayed (not null)
          expect(result.current.metamask.address).toBe(metamaskAddr);
          expect(result.current.metamask.connected).toBe(true);
          expect(result.current.leoWallet.address).toBe(leoAddr);
          expect(result.current.leoWallet.connected).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: wallet-integration-frontend, Property 8: Independent wallet disconnection
   * Validates: Requirements 3.2
   * 
   * For any connected wallet pair, disconnecting one wallet should remove only 
   * that wallet's address while preserving the other wallet's connection state
   */
  it('Property 8: should disconnect wallets independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddress(), // MetaMask address
        fc.integer({ min: 1, max: 999999 }), // Chain ID
        fc.string({ minLength: 30, maxLength: 63 }), // Leo Wallet address
        fc.constantFrom('metamask', 'leo'), // Which wallet to disconnect
        async (metamaskAddr, chainId, leoAddr, walletToDisconnect) => {
          // Setup mocks
          vi.mocked(metamaskConnector.connect).mockResolvedValue({
            address: metamaskAddr,
            chainId,
            connected: true,
          });
          vi.mocked(metamaskConnector.getBalance).mockResolvedValue('1.0');
          vi.mocked(metamaskConnector.disconnect).mockResolvedValue();
          
          vi.mocked(leoWalletConnector.connect).mockResolvedValue({
            address: leoAddr,
            connected: true,
          });
          vi.mocked(leoWalletConnector.getBalance).mockResolvedValue('100.0');
          vi.mocked(leoWalletConnector.disconnect).mockResolvedValue();

          const { result } = renderHook(() => useWalletStore());

          // Connect both wallets
          await act(async () => {
            await result.current.connectMetaMask();
          });

          await act(async () => {
            await result.current.connectLeoWallet();
          });

          // Disconnect one wallet
          if (walletToDisconnect === 'metamask') {
            await act(async () => {
              await result.current.disconnectMetaMask();
            });

            // MetaMask should be disconnected, Leo Wallet should remain connected
            expect(result.current.metamask.connected).toBe(false);
            expect(result.current.metamask.address).toBe(null);
            expect(result.current.leoWallet.connected).toBe(true);
            expect(result.current.leoWallet.address).toBe(leoAddr);
          } else {
            await act(async () => {
              await result.current.disconnectLeoWallet();
            });

            // Leo Wallet should be disconnected, MetaMask should remain connected
            expect(result.current.leoWallet.connected).toBe(false);
            expect(result.current.leoWallet.address).toBe(null);
            expect(result.current.metamask.connected).toBe(true);
            expect(result.current.metamask.address).toBe(metamaskAddr);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: wallet-integration-frontend, Property 9: Connection persistence
   * Validates: Requirements 3.3
   * 
   * For any previously connected wallet, after page reload, the system should 
   * attempt to restore that wallet's connection
   */
  it('Property 9: should persist wallet connections to localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddress(), // MetaMask address
        fc.integer({ min: 1, max: 999999 }), // Chain ID
        fc.string({ minLength: 30, maxLength: 63 }), // Leo Wallet address
        async (metamaskAddr, chainId, leoAddr) => {
          // Setup mocks
          vi.mocked(metamaskConnector.connect).mockResolvedValue({
            address: metamaskAddr,
            chainId,
            connected: true,
          });
          vi.mocked(metamaskConnector.getBalance).mockResolvedValue('1.0');
          
          vi.mocked(leoWalletConnector.connect).mockResolvedValue({
            address: leoAddr,
            connected: true,
          });
          vi.mocked(leoWalletConnector.getBalance).mockResolvedValue('100.0');

          const { result } = renderHook(() => useWalletStore());

          // Connect both wallets
          await act(async () => {
            await result.current.connectMetaMask();
          });

          await act(async () => {
            await result.current.connectLeoWallet();
          });

          // Check that data is persisted in localStorage
          const storedData = localStorage.getItem('wallet-storage');
          expect(storedData).not.toBeNull();

          if (storedData) {
            const parsed = JSON.parse(storedData);
            
            // Verify MetaMask data is persisted
            expect(parsed.state.metamask.connected).toBe(true);
            expect(parsed.state.metamask.address).toBe(metamaskAddr);
            expect(parsed.state.metamask.chainId).toBe(chainId);
            
            // Verify Leo Wallet data is persisted
            expect(parsed.state.leoWallet.connected).toBe(true);
            expect(parsed.state.leoWallet.address).toBe(leoAddr);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
