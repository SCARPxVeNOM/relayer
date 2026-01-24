import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

describe('Wallet Store - Unit Tests', () => {
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

  describe('MetaMask Connection', () => {
    it('should connect to MetaMask successfully', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockChainId = 11155111;
      const mockBalance = '1.5';

      vi.mocked(metamaskConnector.connect).mockResolvedValue({
        address: mockAddress,
        chainId: mockChainId,
        connected: true,
      });
      vi.mocked(metamaskConnector.getBalance).mockResolvedValue(mockBalance);

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectMetaMask();
      });

      expect(result.current.metamask.connected).toBe(true);
      expect(result.current.metamask.address).toBe(mockAddress);
      expect(result.current.metamask.chainId).toBe(mockChainId);
      expect(result.current.metamask.balance).toBe(mockBalance);
    });

    it('should handle MetaMask connection errors', async () => {
      vi.mocked(metamaskConnector.connect).mockRejectedValue(new Error('User rejected'));

      const { result } = renderHook(() => useWalletStore());

      await expect(
        act(async () => {
          await result.current.connectMetaMask();
        })
      ).rejects.toThrow('User rejected');

      expect(result.current.metamask.connected).toBe(false);
    });

    it('should disconnect MetaMask', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      
      vi.mocked(metamaskConnector.connect).mockResolvedValue({
        address: mockAddress,
        chainId: 11155111,
        connected: true,
      });
      vi.mocked(metamaskConnector.getBalance).mockResolvedValue('1.0');
      vi.mocked(metamaskConnector.disconnect).mockResolvedValue();

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectMetaMask();
      });

      expect(result.current.metamask.connected).toBe(true);

      await act(async () => {
        await result.current.disconnectMetaMask();
      });

      expect(result.current.metamask.connected).toBe(false);
      expect(result.current.metamask.address).toBe(null);
      expect(result.current.metamask.chainId).toBe(null);
      expect(result.current.metamask.balance).toBe(null);
    });

    it('should update MetaMask network', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const initialChainId = 11155111;
      const newChainId = 80002;

      vi.mocked(metamaskConnector.connect).mockResolvedValue({
        address: mockAddress,
        chainId: initialChainId,
        connected: true,
      });
      vi.mocked(metamaskConnector.getBalance).mockResolvedValue('1.0');

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectMetaMask();
      });

      expect(result.current.metamask.chainId).toBe(initialChainId);

      act(() => {
        result.current.updateMetaMaskNetwork(newChainId);
      });

      expect(result.current.metamask.chainId).toBe(newChainId);
    });

    it('should update MetaMask balance', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const initialBalance = '1.0';
      const newBalance = '2.5';

      vi.mocked(metamaskConnector.connect).mockResolvedValue({
        address: mockAddress,
        chainId: 11155111,
        connected: true,
      });
      vi.mocked(metamaskConnector.getBalance).mockResolvedValue(initialBalance);

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectMetaMask();
      });

      expect(result.current.metamask.balance).toBe(initialBalance);

      act(() => {
        result.current.updateMetaMaskBalance(newBalance);
      });

      expect(result.current.metamask.balance).toBe(newBalance);
    });
  });

  describe('Leo Wallet Connection', () => {
    it('should connect to Leo Wallet successfully', async () => {
      const mockAddress = 'aleo1abcdefghijklmnopqrstuvwxyz';
      const mockBalance = '100.0';

      vi.mocked(leoWalletConnector.connect).mockResolvedValue({
        address: mockAddress,
        connected: true,
      });
      vi.mocked(leoWalletConnector.getBalance).mockResolvedValue(mockBalance);

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectLeoWallet();
      });

      expect(result.current.leoWallet.connected).toBe(true);
      expect(result.current.leoWallet.address).toBe(mockAddress);
      expect(result.current.leoWallet.balance).toBe(mockBalance);
    });

    it('should handle Leo Wallet connection errors', async () => {
      vi.mocked(leoWalletConnector.connect).mockRejectedValue(new Error('User rejected'));

      const { result } = renderHook(() => useWalletStore());

      await expect(
        act(async () => {
          await result.current.connectLeoWallet();
        })
      ).rejects.toThrow('User rejected');

      expect(result.current.leoWallet.connected).toBe(false);
    });

    it('should disconnect Leo Wallet', async () => {
      const mockAddress = 'aleo1abcdefghijklmnopqrstuvwxyz';
      
      vi.mocked(leoWalletConnector.connect).mockResolvedValue({
        address: mockAddress,
        connected: true,
      });
      vi.mocked(leoWalletConnector.getBalance).mockResolvedValue('100.0');
      vi.mocked(leoWalletConnector.disconnect).mockResolvedValue();

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectLeoWallet();
      });

      expect(result.current.leoWallet.connected).toBe(true);

      await act(async () => {
        await result.current.disconnectLeoWallet();
      });

      expect(result.current.leoWallet.connected).toBe(false);
      expect(result.current.leoWallet.address).toBe(null);
      expect(result.current.leoWallet.balance).toBe(null);
    });

    it('should update Leo Wallet balance', async () => {
      const mockAddress = 'aleo1abcdefghijklmnopqrstuvwxyz';
      const initialBalance = '100.0';
      const newBalance = '150.0';

      vi.mocked(leoWalletConnector.connect).mockResolvedValue({
        address: mockAddress,
        connected: true,
      });
      vi.mocked(leoWalletConnector.getBalance).mockResolvedValue(initialBalance);

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectLeoWallet();
      });

      expect(result.current.leoWallet.balance).toBe(initialBalance);

      act(() => {
        result.current.updateLeoWalletBalance(newBalance);
      });

      expect(result.current.leoWallet.balance).toBe(newBalance);
    });
  });

  describe('Balance Refresh', () => {
    it('should refresh balances for both wallets', async () => {
      const metamaskAddress = '0x1234567890123456789012345678901234567890';
      const leoAddress = 'aleo1abcdefghijklmnopqrstuvwxyz';
      const initialMetaMaskBalance = '1.0';
      const initialLeoBalance = '100.0';
      const newMetaMaskBalance = '2.0';
      const newLeoBalance = '200.0';

      vi.mocked(metamaskConnector.connect).mockResolvedValue({
        address: metamaskAddress,
        chainId: 11155111,
        connected: true,
      });
      vi.mocked(metamaskConnector.getBalance)
        .mockResolvedValueOnce(initialMetaMaskBalance)
        .mockResolvedValueOnce(newMetaMaskBalance);

      vi.mocked(leoWalletConnector.connect).mockResolvedValue({
        address: leoAddress,
        connected: true,
      });
      vi.mocked(leoWalletConnector.getBalance)
        .mockResolvedValueOnce(initialLeoBalance)
        .mockResolvedValueOnce(newLeoBalance);

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectMetaMask();
        await result.current.connectLeoWallet();
      });

      expect(result.current.metamask.balance).toBe(initialMetaMaskBalance);
      expect(result.current.leoWallet.balance).toBe(initialLeoBalance);

      await act(async () => {
        await result.current.refreshBalances();
      });

      expect(result.current.metamask.balance).toBe(newMetaMaskBalance);
      expect(result.current.leoWallet.balance).toBe(newLeoBalance);
    });

    it('should handle balance refresh errors gracefully', async () => {
      const metamaskAddress = '0x1234567890123456789012345678901234567890';
      const leoAddress = 'aleo1abcdefghijklmnopqrstuvwxyz';

      vi.mocked(metamaskConnector.connect).mockResolvedValue({
        address: metamaskAddress,
        chainId: 11155111,
        connected: true,
      });
      vi.mocked(metamaskConnector.getBalance)
        .mockResolvedValueOnce('1.0')
        .mockRejectedValueOnce(new Error('Network error'));

      vi.mocked(leoWalletConnector.connect).mockResolvedValue({
        address: leoAddress,
        connected: true,
      });
      vi.mocked(leoWalletConnector.getBalance)
        .mockResolvedValueOnce('100.0')
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectMetaMask();
        await result.current.connectLeoWallet();
      });

      const initialMetaMaskBalance = result.current.metamask.balance;
      const initialLeoBalance = result.current.leoWallet.balance;

      await act(async () => {
        await result.current.refreshBalances();
      });

      // Balances should remain unchanged on error
      expect(result.current.metamask.balance).toBe(initialMetaMaskBalance);
      expect(result.current.leoWallet.balance).toBe(initialLeoBalance);
    });
  });

  describe('State Persistence', () => {
    it('should persist wallet state to localStorage', async () => {
      const metamaskAddress = '0x1234567890123456789012345678901234567890';
      const leoAddress = 'aleo1abcdefghijklmnopqrstuvwxyz';

      vi.mocked(metamaskConnector.connect).mockResolvedValue({
        address: metamaskAddress,
        chainId: 11155111,
        connected: true,
      });
      vi.mocked(metamaskConnector.getBalance).mockResolvedValue('1.0');

      vi.mocked(leoWalletConnector.connect).mockResolvedValue({
        address: leoAddress,
        connected: true,
      });
      vi.mocked(leoWalletConnector.getBalance).mockResolvedValue('100.0');

      const { result } = renderHook(() => useWalletStore());

      await act(async () => {
        await result.current.connectMetaMask();
        await result.current.connectLeoWallet();
      });

      const storedData = localStorage.getItem('wallet-storage');
      expect(storedData).not.toBeNull();

      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.state.metamask.connected).toBe(true);
        expect(parsed.state.metamask.address).toBe(metamaskAddress);
        expect(parsed.state.leoWallet.connected).toBe(true);
        expect(parsed.state.leoWallet.address).toBe(leoAddress);
      }
    });
  });
});
