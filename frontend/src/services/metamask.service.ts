import { ethers } from 'ethers';
import { config, SUPPORTED_CHAIN_IDS } from '@/config';

export interface WalletConnection {
  address: string;
  chainId?: number;
  connected: boolean;
}

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export class MetaMaskConnector {
  private provider: ethers.BrowserProvider | null = null;
  private accountChangeCallbacks: ((account: string) => void)[] = [];
  private networkChangeCallbacks: ((chainId: number) => void)[] = [];

  /**
   * Check if MetaMask is installed
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true;
  }

  /**
   * Connect to MetaMask wallet
   */
  async connect(): Promise<WalletConnection> {
    if (!this.isInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Use the injected provider directly for account request
      const accounts = await (window.ethereum as any).request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.provider = new ethers.BrowserProvider(window.ethereum!);
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      this.setupEventListeners();

      return {
        address: accounts[0],
        chainId,
        connected: true,
      };
    } catch (error: any) {
      console.error('MetaMask connection error data:', error);

      // Handle MetaMask defined error codes
      // 4001: User rejected the request
      // -32002: Request already pending
      if (error?.code === 4001 || error?.message?.includes('User rejected')) {
        throw new Error('Handshake Rejected: Please approve the request in MetaMask');
      }

      if (error?.code === -32002) {
        throw new Error('Connection Pending: Please check your MetaMask window');
      }

      const message = error?.message || 'Failed to establish secure link';
      throw new Error(message);
    }
  }

  /**
   * Disconnect from MetaMask
   */
  async disconnect(): Promise<void> {
    this.removeEventListeners();
    this.provider = null;
    this.accountChangeCallbacks = [];
    this.networkChangeCallbacks = [];
  }

  /**
   * Get current connected account
   */
  async getAccount(): Promise<string | null> {
    if (!this.isInstalled()) {
      return null;
    }

    try {
      const accounts = await window.ethereum!.request({
        method: 'eth_accounts',
      }) as string[];

      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }

  /**
   * Get current network chain ID
   */
  async getNetwork(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  /**
   * Switch to a specific network
   */
  async switchNetwork(chainId: number): Promise<void> {
    if (!this.isInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: unknown) {
      // If the chain hasn't been added to MetaMask, add it
      if (error && typeof error === 'object' && 'code' in error && error.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw error;
      }
    }
  }

  /**
   * Add a network to MetaMask
   */
  private async addNetwork(chainId: number): Promise<void> {
    const chainConfig = chainId === config.chains.sepolia.chainId
      ? config.chains.sepolia
      : config.chains.amoy;

    await window.ethereum!.request({
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

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Check if the current network is supported
   */
  async isSupportedNetwork(): Promise<boolean> {
    try {
      const chainId = await this.getNetwork();
      return SUPPORTED_CHAIN_IDS.includes(chainId as typeof SUPPORTED_CHAIN_IDS[number]);
    } catch {
      return false;
    }
  }

  /**
   * Listen for account changes
   */
  onAccountChange(callback: (account: string) => void): void {
    this.accountChangeCallbacks.push(callback);
  }

  /**
   * Listen for network changes
   */
  onNetworkChange(callback: (chainId: number) => void): void {
    this.networkChangeCallbacks.push(callback);
  }

  /**
   * Setup event listeners for MetaMask events
   */
  private setupEventListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', this.handleAccountsChanged);
    window.ethereum.on('chainChanged', this.handleChainChanged);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', this.handleChainChanged);
  }

  /**
   * Handle account change events
   */
  private handleAccountsChanged = (accounts: unknown): void => {
    const accountsArray = accounts as string[];
    if (accountsArray && accountsArray.length > 0) {
      this.accountChangeCallbacks.forEach(callback => callback(accountsArray[0]));
    }
  };

  /**
   * Handle chain change events
   */
  private handleChainChanged = (chainIdHex: unknown): void => {
    const chainId = parseInt(chainIdHex as string, 16);
    this.networkChangeCallbacks.forEach(callback => callback(chainId));
  };
}

// Export singleton instance
export const metamaskConnector = new MetaMaskConnector();
