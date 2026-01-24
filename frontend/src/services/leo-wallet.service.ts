import { config } from '@/config';

export interface WalletConnection {
  address: string;
  connected: boolean;
}

export interface AleoTransactionParams {
  programId: string;
  functionName: string;
  inputs: string[];
  fee: number;
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionStatusDetail {
  status: TransactionStatus;
  aleoTxId: string;
  publicChainTxHash?: string;
  blockHeight?: number;
  errorMessage?: string;
}

export interface LeoWalletAPI {
  connect: () => Promise<{ address: string }>;
  disconnect: () => Promise<void>;
  getAccount: () => Promise<string | null>;
  requestTransaction: (params: AleoTransactionParams) => Promise<string>;
  getBalance: (address: string) => Promise<string>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    leoWallet?: LeoWalletAPI;
  }
}

export class LeoWalletConnector {
  private accountChangeCallbacks: ((account: string) => void)[] = [];
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Check if Leo Wallet is installed
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.leoWallet !== 'undefined';
  }

  /**
   * Connect to Leo Wallet
   */
  async connect(): Promise<WalletConnection> {
    if (!this.isInstalled()) {
      throw new Error('Leo Wallet is not installed');
    }

    try {
      const result = await window.leoWallet!.connect();

      if (!result || !result.address) {
        throw new Error('No account found');
      }

      this.setupEventListeners();

      return {
        address: result.address,
        connected: true,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('rejected')) {
          throw new Error('Connection rejected by user');
        }
        throw error;
      }
      throw new Error('Failed to connect to Leo Wallet');
    }
  }

  /**
   * Disconnect from Leo Wallet
   */
  async disconnect(): Promise<void> {
    this.removeEventListeners();
    this.accountChangeCallbacks = [];
    
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();

    if (this.isInstalled() && window.leoWallet!.disconnect) {
      try {
        await window.leoWallet!.disconnect();
      } catch (error) {
        console.error('Failed to disconnect from Leo Wallet:', error);
      }
    }
  }

  /**
   * Get current connected account
   */
  async getAccount(): Promise<string | null> {
    if (!this.isInstalled()) {
      return null;
    }

    try {
      const account = await window.leoWallet!.getAccount();
      return account;
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }

  /**
   * Request a transaction through Leo Wallet
   */
  async requestTransaction(params: AleoTransactionParams): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Leo Wallet is not installed');
    }

    try {
      const txId = await window.leoWallet!.requestTransaction(params);
      
      if (!txId) {
        throw new Error('Transaction failed: No transaction ID returned');
      }

      return txId;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('rejected')) {
          throw new Error('Transaction rejected by user');
        }
        if (error.message.includes('Insufficient')) {
          throw new Error('Insufficient balance');
        }
        throw error;
      }
      throw new Error('Failed to submit transaction');
    }
  }

  /**
   * Get transaction status by polling the relayer API
   */
  async getTransactionStatus(txId: string): Promise<TransactionStatusDetail> {
    try {
      const response = await fetch(`${config.relayer.apiUrl}/api/transaction/${txId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Transaction not yet processed by relayer
          return {
            status: 'pending',
            aleoTxId: txId,
          };
        }
        throw new Error(`Failed to fetch transaction status: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        status: data.status || 'pending',
        aleoTxId: txId,
        publicChainTxHash: data.publicChainTxHash,
        blockHeight: data.blockHeight,
        errorMessage: data.errorMessage,
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      // Return pending status on error to allow retry
      return {
        status: 'pending',
        aleoTxId: txId,
      };
    }
  }

  /**
   * Monitor transaction status with polling
   * @param txId Transaction ID to monitor
   * @param onStatusChange Callback when status changes
   * @param pollInterval Polling interval in milliseconds (default: 5000)
   * @param maxAttempts Maximum polling attempts (default: 120, which is 10 minutes at 5s intervals)
   */
  monitorTransaction(
    txId: string,
    onStatusChange: (status: TransactionStatusDetail) => void,
    pollInterval: number = 5000,
    maxAttempts: number = 120
  ): () => void {
    let attempts = 0;
    let lastStatus: TransactionStatus = 'pending';

    const poll = async () => {
      attempts++;

      try {
        const statusDetail = await this.getTransactionStatus(txId);

        // Only call callback if status changed
        if (statusDetail.status !== lastStatus) {
          lastStatus = statusDetail.status;
          onStatusChange(statusDetail);
        }

        // Stop polling if transaction is confirmed or failed
        if (statusDetail.status === 'confirmed' || statusDetail.status === 'failed') {
          this.stopMonitoring(txId);
        }

        // Stop polling if max attempts reached
        if (attempts >= maxAttempts) {
          this.stopMonitoring(txId);
          onStatusChange({
            status: 'failed',
            aleoTxId: txId,
            errorMessage: 'Transaction monitoring timeout',
          });
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
        // Continue polling on error
      }
    };

    // Start polling
    const interval = setInterval(poll, pollInterval);
    this.pollingIntervals.set(txId, interval);

    // Do initial poll immediately
    poll();

    // Return stop function
    return () => this.stopMonitoring(txId);
  }

  /**
   * Stop monitoring a transaction
   */
  private stopMonitoring(txId: string): void {
    const interval = this.pollingIntervals.get(txId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(txId);
    }
  }

  /**
   * Get balance for an Aleo address
   */
  async getBalance(address: string): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Leo Wallet is not installed');
    }

    try {
      const balance = await window.leoWallet!.getBalance(address);
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw new Error('Failed to fetch balance');
    }
  }

  /**
   * Listen for account changes
   */
  onAccountChange(callback: (account: string) => void): void {
    this.accountChangeCallbacks.push(callback);
  }

  /**
   * Setup event listeners for Leo Wallet events
   */
  private setupEventListeners(): void {
    if (!window.leoWallet || !window.leoWallet.on) return;

    window.leoWallet.on('accountChanged', this.handleAccountChanged);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!window.leoWallet || !window.leoWallet.removeListener) return;

    window.leoWallet.removeListener('accountChanged', this.handleAccountChanged);
  }

  /**
   * Handle account change events
   */
  private handleAccountChanged = (account: unknown): void => {
    const accountStr = account as string;
    if (accountStr) {
      this.accountChangeCallbacks.forEach(callback => callback(accountStr));
    }
  };
}

// Export singleton instance
export const leoWalletConnector = new LeoWalletConnector();
