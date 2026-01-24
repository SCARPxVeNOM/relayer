import { leoWalletConnector, type AleoTransactionParams, type TransactionStatusDetail } from './leo-wallet.service';
import { transactionMonitorService, type MonitoringOptions } from './transaction-monitor.service';
import { config } from '@/config';
import type { DestinationChain } from '@/stores/transfer.store';

export interface TransferRequest {
  amount: string;
  destinationChain: DestinationChain;
  recipientAddress: string;
}

export interface TransferResult {
  txId: string;
  status: 'pending';
}

export class TransactionService {
  /**
   * Build Aleo transaction parameters for a transfer request
   */
  buildTransferParams(request: TransferRequest): AleoTransactionParams {
    const { amount, destinationChain, recipientAddress } = request;
    
    // Convert destination chain to chain ID
    const chainId = destinationChain === 'sepolia' 
      ? config.chains.sepolia.chainId 
      : config.chains.amoy.chainId;
    
    // Build transaction parameters for the Aleo program
    // The request_transfer function expects: vault, amount, chain_id, recipient
    return {
      programId: config.aleo.programId,
      functionName: 'request_transfer',
      inputs: [
        amount,
        chainId.toString(),
        recipientAddress,
      ],
      fee: 1000000, // 1 Aleo credit as fee
    };
  }

  /**
   * Submit a transfer request through Leo Wallet
   */
  async submitTransfer(request: TransferRequest): Promise<TransferResult> {
    try {
      // Build transaction parameters
      const params = this.buildTransferParams(request);
      
      // Submit transaction through Leo Wallet
      const txId = await leoWalletConnector.requestTransaction(params);
      
      return {
        txId,
        status: 'pending',
      };
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw with more context
        throw new Error(`Transfer submission failed: ${error.message}`);
      }
      throw new Error('Transfer submission failed: Unknown error');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txId: string): Promise<TransactionStatusDetail> {
    return transactionMonitorService.fetchTransactionStatus(txId);
  }

  /**
   * Monitor transaction status with automatic polling and exponential backoff
   * @param txId Transaction ID to monitor
   * @param onStatusChange Callback when status changes
   * @param options Monitoring options
   * @returns Function to stop monitoring
   */
  monitorTransaction(
    txId: string,
    onStatusChange: (status: TransactionStatusDetail) => void,
    options?: MonitoringOptions
  ): () => void {
    return transactionMonitorService.startMonitoring(txId, onStatusChange, options);
  }

  /**
   * Retry getting transaction status with exponential backoff
   * @param txId Transaction ID
   * @param maxRetries Maximum number of retries
   * @param initialDelay Initial delay in milliseconds
   * @returns Transaction status
   */
  async retryGetStatus(
    txId: string,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<TransactionStatusDetail> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const status = await this.getTransactionStatus(txId);
        return status;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't wait after the last attempt
        if (attempt < maxRetries - 1) {
          // Exponential backoff: delay * 2^attempt
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, throw the last error
    throw new Error(`Failed to get transaction status after ${maxRetries} attempts: ${lastError?.message}`);
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
