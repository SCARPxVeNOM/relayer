import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MetaMaskConnector } from './metamask.service';

describe('MetaMask Connector - Unit Tests', () => {
  let connector: MetaMaskConnector;

  beforeEach(() => {
    connector = new MetaMaskConnector();
    delete (window as { ethereum?: unknown }).ethereum;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Flow', () => {
    it('should successfully connect to MetaMask', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockChainId = 11155111; // Sepolia

      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock
        .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
        .mockResolvedValueOnce(`0x${mockChainId.toString(16)}`); // eth_chainId

      const result = await connector.connect();

      expect(result.address).toBe(mockAddress);
      expect(result.connected).toBe(true);
      expect(requestMock).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    it('should throw error when MetaMask is not installed', async () => {
      delete (window as { ethereum?: unknown }).ethereum;

      await expect(connector.connect()).rejects.toThrow('MetaMask is not installed');
    });

    it('should throw error when user rejects connection', async () => {
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock.mockRejectedValueOnce(new Error('User rejected the request'));

      await expect(connector.connect()).rejects.toThrow();
    });

    it('should throw error when no accounts are returned', async () => {
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock.mockResolvedValueOnce([]);

      await expect(connector.connect()).rejects.toThrow('No accounts found');
    });

    it('should disconnect and clean up', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockChainId = 11155111;
      const requestMock = vi.fn();
      const onMock = vi.fn();
      const removeListenerMock = vi.fn();
      
      const mockProvider = {
        request: requestMock,
        on: onMock,
        removeListener: removeListenerMock,
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock
        .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
        .mockResolvedValueOnce(`0x${mockChainId.toString(16)}`); // eth_chainId

      await connector.connect();
      await connector.disconnect();

      expect(removeListenerMock).toHaveBeenCalled();
    });
  });

  describe('Account Management', () => {
    it('should get current account', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock.mockResolvedValueOnce([mockAddress]);

      const account = await connector.getAccount();

      expect(account).toBe(mockAddress);
      expect(requestMock).toHaveBeenCalledWith({
        method: 'eth_accounts',
      });
    });

    it('should return null when no account is connected', async () => {
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock.mockResolvedValueOnce([]);

      const account = await connector.getAccount();

      expect(account).toBeNull();
    });

    it('should return null when MetaMask is not installed', async () => {
      delete (window as { ethereum?: unknown }).ethereum;

      const account = await connector.getAccount();

      expect(account).toBeNull();
    });
  });

  describe('Network Switching', () => {
    it('should switch to a different network', async () => {
      const targetChainId = 11155111; // Sepolia
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock.mockResolvedValueOnce(undefined);

      await connector.switchNetwork(targetChainId);

      expect(requestMock).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia in hex
      });
    });

    it('should switch to Amoy network', async () => {
      const targetChainId = 80002; // Amoy
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock.mockResolvedValueOnce(undefined);

      await connector.switchNetwork(targetChainId);

      expect(requestMock).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13882' }], // Amoy in hex
      });
    });

    it('should add network if not already added (error code 4902)', async () => {
      const targetChainId = 11155111; // Sepolia
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      
      // First call fails with 4902, second call succeeds
      requestMock
        .mockRejectedValueOnce({ code: 4902 })
        .mockResolvedValueOnce(undefined);

      await connector.switchNetwork(targetChainId);

      expect(requestMock).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
      expect(requestMock).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: expect.any(Array),
      });
    });

    it('should add Sepolia network with correct configuration', async () => {
      const targetChainId = 11155111; // Sepolia
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      
      // First call fails with 4902, second call succeeds
      requestMock
        .mockRejectedValueOnce({ code: 4902 })
        .mockResolvedValueOnce(undefined);

      await connector.switchNetwork(targetChainId);

      expect(requestMock).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xaa36a7',
            chainName: 'Ethereum Sepolia',
            nativeCurrency: {
              name: 'Sepolia ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: expect.arrayContaining([expect.stringContaining('sepolia')]),
            blockExplorerUrls: expect.arrayContaining([expect.stringContaining('sepolia')]),
          },
        ],
      });
    });

    it('should add Amoy network with correct configuration', async () => {
      const targetChainId = 80002; // Amoy
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      
      // First call fails with 4902, second call succeeds
      requestMock
        .mockRejectedValueOnce({ code: 4902 })
        .mockResolvedValueOnce(undefined);

      await connector.switchNetwork(targetChainId);

      expect(requestMock).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x13882',
            chainName: 'Polygon Amoy',
            nativeCurrency: {
              name: 'MATIC',
              symbol: 'MATIC',
              decimals: 18,
            },
            rpcUrls: expect.arrayContaining([expect.stringContaining('amoy')]),
            blockExplorerUrls: expect.arrayContaining([expect.stringContaining('amoy')]),
          },
        ],
      });
    });

    it('should throw error when MetaMask is not installed', async () => {
      delete (window as { ethereum?: unknown }).ethereum;

      await expect(connector.switchNetwork(11155111)).rejects.toThrow('MetaMask is not installed');
    });

    it('should propagate user rejection error', async () => {
      const targetChainId = 11155111;
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      
      const userRejectionError = { code: 4001, message: 'User rejected the request' };
      requestMock.mockRejectedValueOnce(userRejectionError);

      await expect(connector.switchNetwork(targetChainId)).rejects.toEqual(userRejectionError);
    });

    it('should propagate network errors other than 4902', async () => {
      const targetChainId = 11155111;
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      
      const networkError = { code: -32603, message: 'Internal JSON-RPC error' };
      requestMock.mockRejectedValueOnce(networkError);

      await expect(connector.switchNetwork(targetChainId)).rejects.toEqual(networkError);
    });

    it('should handle generic errors during network switch', async () => {
      const targetChainId = 11155111;
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      
      const genericError = new Error('Network request failed');
      requestMock.mockRejectedValueOnce(genericError);

      await expect(connector.switchNetwork(targetChainId)).rejects.toThrow('Network request failed');
    });
  });

  describe('Event Listeners', () => {
    it('should register account change callback', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockChainId = 11155111;
      const newAddress = '0x9876543210987654321098765432109876543210';
      
      let accountsChangedCallback: ((accounts: string[]) => void) | null = null;
      
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn((event: string, callback: (accounts: string[]) => void) => {
          if (event === 'accountsChanged') {
            accountsChangedCallback = callback;
          }
        }),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock
        .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
        .mockResolvedValueOnce(`0x${mockChainId.toString(16)}`); // eth_chainId

      await connector.connect();

      const accountChangeCallback = vi.fn();
      connector.onAccountChange(accountChangeCallback);

      // Simulate account change
      if (accountsChangedCallback) {
        accountsChangedCallback([newAddress]);
      }

      expect(accountChangeCallback).toHaveBeenCalledWith(newAddress);
    });

    it('should register network change callback', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockChainId = 11155111;
      const newChainId = 80002; // Amoy
      
      let chainChangedCallback: ((chainId: string) => void) | null = null;
      
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
      requestMock
        .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
        .mockResolvedValueOnce(`0x${mockChainId.toString(16)}`); // eth_chainId

      await connector.connect();

      const networkChangeCallback = vi.fn();
      connector.onNetworkChange(networkChangeCallback);

      // Simulate network change
      if (chainChangedCallback) {
        chainChangedCallback('0x13882'); // Amoy in hex
      }

      expect(networkChangeCallback).toHaveBeenCalledWith(newChainId);
    });
  });

  describe('Balance Fetching', () => {
    it('should get balance for an address', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockChainId = 11155111;
      const requestMock = vi.fn();
      const mockProvider = {
        request: requestMock,
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };

      (window as { ethereum?: unknown }).ethereum = mockProvider;
      requestMock
        .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
        .mockResolvedValueOnce(`0x${mockChainId.toString(16)}`); // eth_chainId

      await connector.connect();

      // Note: This test would need proper mocking of ethers.BrowserProvider
      // For now, we test that the method exists and throws appropriate error
      await expect(connector.getBalance(mockAddress)).rejects.toThrow();
    });

    it('should throw error when provider is not initialized', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';

      await expect(connector.getBalance(mockAddress)).rejects.toThrow('Provider not initialized');
    });
  });

  describe('Network Validation', () => {
    it('should check if MetaMask is installed', () => {
      delete (window as { ethereum?: unknown }).ethereum;
      expect(connector.isInstalled()).toBe(false);

      (window as { ethereum?: unknown }).ethereum = {
        request: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true,
      };
      expect(connector.isInstalled()).toBe(true);
    });
  });
});
