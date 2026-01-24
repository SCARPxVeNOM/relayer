import { config } from '@/config';
import type { TransactionStatusDetail, TransactionStatus } from './leo-wallet.service';

export interface MonitoringOptions {
  pollInterval?: number;
  maxAttempts?: number;
  enableExponentialBackoff?: boolean;
  maxBackoffInterval?: number;
}

export interface MonitoringState {
  txId: string;
  attempts: number;
  currentInterval: number;
  lastStatus: TransactionStatus;
  isActive: boolean;
}

export class TransactionMonitorService {
  private activeMonitors: Map<string, MonitoringState> = new Map();
  private intervalHandles: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Fetch transaction status from relayer API
   */
  async fetchTransactionStatus(txId: string): Promise<TransactionStatusDetail> {
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
      throw error;
    }
  }

  /**
   * Check if transaction is in terminal state (confirmed or failed)
   */
  private isTerminalState(status: TransactionStatus): boolean {
    return status === 'confirmed' || status === 'failed';
  }

  /**
   * Calculate next polling interval with exponential backoff
   */
  private calculateNextInterval(
    currentInterval: number,
    baseInterval: number,
    maxInterval: number,
    attempts: number
  ): number {
    // Exponential backoff: baseInterval * 2^(attempts / 10)
    // This grows slowly: doubles every 10 attempts
    const exponentialInterval = baseInterval * Math.pow(2, Math.floor(attempts / 10));
    return Math.min(exponentialInterval, maxInterval);
  }

  /**
   * Start monitoring a transaction
   */
  startMonitoring(
    txId: string,
    onStatusChange: (status: TransactionStatusDetail) => void,
    options: MonitoringOptions = {}
  ): () => void {
    const {
      pollInterval = 5000,
      maxAttempts = 120,
      enableExponentialBackoff = true,
      maxBackoffInterval = 30000,
    } = options;

    // Stop existing monitoring for this transaction if any
    this.stopMonitoring(txId);

    // Initialize monitoring state
    const state: MonitoringState = {
      txId,
      attempts: 0,
      currentInterval: pollInterval,
      lastStatus: 'pending',
      isActive: true,
    };
    this.activeMonitors.set(txId, state);

    // Polling function
    const poll = async () => {
      const currentState = this.activeMonitors.get(txId);
      if (!currentState || !currentState.isActive) {
        return;
      }

      currentState.attempts++;

      try {
        const statusDetail = await this.fetchTransactionStatus(txId);

        // Check if status changed
        if (statusDetail.status !== currentState.lastStatus) {
          currentState.lastStatus = statusDetail.status;
          onStatusChange(statusDetail);
        }

        // Stop monitoring if transaction reached terminal state
        if (this.isTerminalState(statusDetail.status)) {
          this.stopMonitoring(txId);
          return;
        }

        // Check if max attempts reached
        if (currentState.attempts >= maxAttempts) {
          this.stopMonitoring(txId);
          onStatusChange({
            status: 'failed',
            aleoTxId: txId,
            errorMessage: 'Transaction monitoring timeout: maximum attempts reached',
          });
          return;
        }

        // Update interval with exponential backoff if enabled
        if (enableExponentialBackoff) {
          const nextInterval = this.calculateNextInterval(
            currentState.currentInterval,
            pollInterval,
            maxBackoffInterval,
            currentState.attempts
          );
          
          if (nextInterval !== currentState.currentInterval) {
            currentState.currentInterval = nextInterval;
            // Restart polling with new interval
            this.stopMonitoring(txId);
            if (currentState.isActive) {
              this.scheduleNextPoll(txId, poll, nextInterval);
            }
          } else {
            // Schedule next poll with same interval
            this.scheduleNextPoll(txId, poll, currentState.currentInterval);
          }
        } else {
          // Schedule next poll with fixed interval
          this.scheduleNextPoll(txId, poll, pollInterval);
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
        
        // Continue polling on error, but update interval with backoff
        if (enableExponentialBackoff) {
          const nextInterval = this.calculateNextInterval(
            currentState.currentInterval,
            pollInterval,
            maxBackoffInterval,
            currentState.attempts
          );
          currentState.currentInterval = nextInterval;
        }
        
        // Schedule next poll
        this.scheduleNextPoll(
          txId,
          poll,
          enableExponentialBackoff ? currentState.currentInterval : pollInterval
        );
      }
    };

    // Start with immediate poll
    poll();

    // Return stop function
    return () => this.stopMonitoring(txId);
  }

  /**
   * Schedule next poll
   */
  private scheduleNextPoll(txId: string, pollFn: () => Promise<void>, interval: number): void {
    const handle = setTimeout(pollFn, interval);
    this.intervalHandles.set(txId, handle);
  }

  /**
   * Stop monitoring a specific transaction
   */
  stopMonitoring(txId: string): void {
    // Clear interval handle
    const handle = this.intervalHandles.get(txId);
    if (handle) {
      clearTimeout(handle);
      this.intervalHandles.delete(txId);
    }

    // Mark state as inactive and remove
    const state = this.activeMonitors.get(txId);
    if (state) {
      state.isActive = false;
      this.activeMonitors.delete(txId);
    }
  }

  /**
   * Stop all active monitoring
   */
  stopAllMonitoring(): void {
    const txIds = Array.from(this.activeMonitors.keys());
    txIds.forEach(txId => this.stopMonitoring(txId));
  }

  /**
   * Get monitoring state for a transaction
   */
  getMonitoringState(txId: string): MonitoringState | undefined {
    return this.activeMonitors.get(txId);
  }

  /**
   * Check if a transaction is being monitored
   */
  isMonitoring(txId: string): boolean {
    const state = this.activeMonitors.get(txId);
    return state?.isActive ?? false;
  }

  /**
   * Get all active monitoring transaction IDs
   */
  getActiveMonitors(): string[] {
    return Array.from(this.activeMonitors.keys()).filter(txId => {
      const state = this.activeMonitors.get(txId);
      return state?.isActive ?? false;
    });
  }
}

// Export singleton instance
export const transactionMonitorService = new TransactionMonitorService();
