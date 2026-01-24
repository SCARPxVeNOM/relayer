/**
 * Scheduler Layer
 * 
 * Mathematical Model: M/M/k Queue
 * 
 * The scheduler assigns batches to available wallets.
 * 
 * This layer ensures:
 * - No nonce collisions (each wallet has independent NonceManager)
 * - Load balancing across k wallets
 * - Parallel execution capability
 * 
 * The scheduler implements the service process (μ) by distributing
 * batches across k wallets, achieving k × μ total service rate.
 */

import { Batch, ExecutionResult } from './types.js';
import { createLogger } from '../utils/logger.js';
import walletPool from './walletPool.js';

const logger = createLogger("Scheduler");

class Scheduler {
  private executingBatches: Set<string> = new Set();

  /**
   * Schedule batch for execution
   * 
   * This distributes the batch across available wallets.
   * Each intent in the batch is assigned to a wallet independently.
   * 
   * Parallelism: All intents execute in parallel using Promise.all
   * This maximizes k × μ (total service rate).
   */
  async scheduleBatch(
    batch: Batch,
    executor: (intent: any, wallet: any, gasManager: any) => Promise<ExecutionResult>
  ): Promise<ExecutionResult[]> {
    // Prevent duplicate execution
    if (this.executingBatches.has(batch.id)) {
      logger.warn(`Batch ${batch.id} already executing`);
      return [];
    }

    this.executingBatches.add(batch.id);

    try {
      logger.info(`Scheduling batch`, {
        batchId: batch.id,
        chainId: batch.chainId,
        intentCount: batch.intents.length,
        k: walletPool.getWalletCount(batch.chainId), // Number of wallets (servers)
      });

      // Execute all intents in parallel
      // This maximizes throughput by utilizing all k wallets simultaneously
      // Total service rate = k × μ (where μ is per-wallet service rate)
      const results = await Promise.allSettled(
        batch.intents.map(async (intent) => {
          // Select wallet (round-robin load balancing)
          const { wallet, gasManager, address } = walletPool.selectWallet(batch.chainId);

          try {
            // Execute intent
            const result = await executor(intent, wallet, gasManager);
            
            // Mark wallet as available
            walletPool.markWalletAvailable(batch.chainId, address);
            
            return result;
          } catch (error) {
            // Mark wallet as available even on error
            walletPool.markWalletAvailable(batch.chainId, address);
            throw error;
          }
        })
      );

      // Process results
      const executionResults: ExecutionResult[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const intent = batch.intents[i];

        if (result.status === 'fulfilled') {
          executionResults.push(result.value);
        } else {
          executionResults.push({
            requestId: intent.requestId,
            success: false,
            error: result.reason?.message || String(result.reason),
          });
        }
      }

      logger.info(`Batch execution completed`, {
        batchId: batch.id,
        successCount: executionResults.filter(r => r.success).length,
        failureCount: executionResults.filter(r => !r.success).length,
      });

      return executionResults;
    } finally {
      this.executingBatches.delete(batch.id);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      executingBatches: this.executingBatches.size,
      batchIds: Array.from(this.executingBatches),
    };
  }
}

export default new Scheduler();

