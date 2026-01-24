/**
 * Dead Letter Queue - Handles permanently failed transactions
 */

import { createLogger } from './logger.js';
import transactionStorage from '../storage/transaction.db.js';

const logger = createLogger("DeadLetterQueue");

class DeadLetterQueue {
  constructor() {
    this.maxRetries = parseInt(process.env.MAX_RETRIES || "3");
    this.retryDelay = parseInt(process.env.RETRY_DELAY || "60000"); // 1 minute
    this.retryTimer = null;
  }

  /**
   * Add failed transaction to DLQ
   */
  addFailed(request, error) {
    logger.warn(`Adding to dead letter queue`, {
      requestId: request.requestId,
      error: error?.message || error,
      retryCount: request.retryCount || 0,
    });

    // Store in database if available
    if (transactionStorage.initialized) {
      try {
        transactionStorage.updateStatus(request.requestId, 'failed', {
          errorMessage: error?.message || String(error),
        });
      } catch (err) {
        logger.error("Failed to store in DLQ", err);
      }
    }
  }

  /**
   * Check if transaction should be retried
   */
  shouldRetry(request) {
    const retryCount = request.retryCount || 0;
    return retryCount < this.maxRetries;
  }

  /**
   * Get failed transactions for retry
   */
  getFailedForRetry() {
    if (!transactionStorage.initialized) {
      return [];
    }

    try {
      return transactionStorage.getFailedTransactions(this.maxRetries);
    } catch (error) {
      logger.error("Failed to get failed transactions", error);
      return [];
    }
  }

  /**
   * Start retry process
   */
  startRetryProcessor(retryCallback) {
    if (this.retryTimer) {
      return; // Already running
    }

    logger.info("Starting dead letter queue retry processor");

    const processRetries = async () => {
      try {
        const failed = this.getFailedForRetry();
        
        if (failed.length > 0) {
          logger.info(`Processing ${failed.length} failed transactions for retry`);
          
          for (const tx of failed) {
            try {
              // Reconstruct request from stored data
              const request = {
                requestId: tx.request_id,
                chainId: tx.chain_id,
                amount: tx.amount,
                recipient: tx.recipient,
                retryCount: tx.retry_count || 0,
              };

              await retryCallback(request);
            } catch (error) {
              logger.error(`Retry failed for ${tx.request_id}`, error);
            }
          }
        }
      } catch (error) {
        logger.error("Error in retry processor", error);
      }
    };

    // Process immediately, then on interval
    processRetries();
    this.retryTimer = setInterval(processRetries, this.retryDelay);
  }

  /**
   * Stop retry process
   */
  stopRetryProcessor() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
      logger.info("Stopped dead letter queue retry processor");
    }
  }
}

export default new DeadLetterQueue();

