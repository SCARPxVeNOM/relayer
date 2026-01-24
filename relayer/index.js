import "dotenv/config";
import aleoListener from "./aleo.listener.js";
import batchQueue from "./batch.queue.js";
import ethExecutor from "./executor.eth.js";
import polygonExecutor from "./executor.polygon.js";
import { createLogger } from "./utils/logger.js";
import { CHAINS, CHAIN_NAMES } from "./config.js";
import transactionStorage from "./storage/transaction.db.js";
import healthAPI from "./api/health.js";
import deadLetterQueue from "./utils/dead-letter-queue.js";

const logger = createLogger("Relayer");

/**
 * Handle transfer intent from Aleo listener
 * Adds request to batch queue
 */
async function handleTransferIntent(intent) {
  try {
    logger.info("📦 Received transfer intent", {
      requestId: intent.requestId,
      chainId: intent.chainId,
      amount: intent.amount,
      recipient: intent.recipient,
    });

    // Validate intent
    if (!intent.requestId || !intent.chainId || !intent.amount || !intent.recipient) {
      logger.error("Invalid transfer intent", intent);
      return;
    }

    // Add to batch queue with appropriate executor callback
    const onBatchReady = async (batch, chainId) => {
      await executeBatch(batch, chainId);
    };

    batchQueue.add(intent, onBatchReady);
  } catch (error) {
    logger.error("Failed to handle transfer intent", error);
  }
}

/**
 * Execute a batch of transfers
 */
async function executeBatch(batch, chainId) {
  try {
    logger.info(`Executing batch for chain ${chainId}`, {
      batchSize: batch.length,
      chainName: CHAIN_NAMES[chainId],
    });

    let result;

    if (chainId === CHAINS.ETH_SEPOLIA) {
      result = await ethExecutor.executeBatch(batch);
    } else if (chainId === CHAINS.POLYGON_AMOY) {
      result = await polygonExecutor.executeBatch(batch);
    } else {
      logger.error(`Unsupported chain ID: ${chainId}`);
      return;
    }

    logger.info(`Batch execution completed`, {
      chainId,
      successCount: result.successCount,
      failureCount: result.failureCount,
      total: result.total,
    });

    // Log failures if any
    if (result.failures.length > 0) {
      logger.warn(`Batch had ${result.failures.length} failure(s)`, {
        failures: result.failures.map(f => ({
          requestId: f.requestId,
          error: f.error?.message || f.error,
        })),
      });
    }

    // Update transaction status in storage
    if (transactionStorage.initialized) {
      for (const success of result.successes) {
        transactionStorage.updateStatus(success.requestId, 'confirmed', {
          publicChainTxHash: success.txHash,
          processedAt: Date.now(),
        });
      }
      
      for (const failure of result.failures) {
        transactionStorage.updateStatus(failure.requestId, 'failed', {
          errorMessage: failure.error?.message || String(failure.error),
        });
        
        // Add to dead letter queue if retries exhausted
        const request = batch.find(r => r.requestId === failure.requestId);
        if (request && !deadLetterQueue.shouldRetry({ retryCount: failure.retryCount || 0 })) {
          deadLetterQueue.addFailed(request, failure.error);
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to execute batch for chain ${chainId}`, error);
  }
}

/**
 * Main relayer function
 */
async function main() {
  try {
    logger.info("🚀 Starting Multi-Chain Privacy Relayer");
    logger.info("Configuration", {
      aleoProgram: process.env.ALEO_PROGRAM_ID || "privacy_box_mvp.aleo",
      maxBatchSize: process.env.MAX_BATCH_SIZE || "5",
      maxBatchWaitTime: process.env.MAX_BATCH_WAIT_TIME || "10000",
      supportedChains: Object.values(CHAINS).filter(c => [CHAINS.ETH_SEPOLIA, CHAINS.POLYGON_AMOY].includes(c)),
    });

    // Validate environment
    if (!process.env.RELAYER_PK) {
      throw new Error("RELAYER_PK environment variable is required");
    }

    // Initialize transaction storage
    logger.info("Initializing transaction storage...");
    try {
      transactionStorage.initialize();
    } catch (error) {
      logger.warn("Failed to initialize transaction storage, continuing without persistence", error);
    }

    // Initialize executors
    logger.info("Initializing executors...");
    await Promise.all([
      ethExecutor.initialize().catch(err => {
        logger.error("Failed to initialize ETH executor", err);
      }),
      polygonExecutor.initialize().catch(err => {
        logger.error("Failed to initialize Polygon executor", err);
      }),
    ]);

    // Start health API
    logger.info("Starting health API...");
    healthAPI.start();

    // Start dead letter queue retry processor
    logger.info("Starting dead letter queue processor...");
    deadLetterQueue.startRetryProcessor(async (request) => {
      // Retry failed transaction
      const onBatchReady = async (batch, chainId) => {
        await executeBatch(batch, chainId);
      };
      batchQueue.add(request, onBatchReady);
    });

    // Start monitoring Aleo for real transactions
    logger.info("🔍 Starting Aleo transaction monitoring...");
    
    await aleoListener.startPolling(handleTransferIntent);

    // Log queue status periodically
    const statusInterval = setInterval(() => {
      const queueSizes = batchQueue.getQueueSizes();
      if (Object.keys(queueSizes).length > 0) {
        logger.debug("Queue status", queueSizes);
      }
    }, 30000); // Every 30 seconds

    // Keep process alive
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      clearInterval(statusInterval);
      aleoListener.stopPolling();
      deadLetterQueue.stopRetryProcessor();
      healthAPI.stop();
      
      // Flush pending batches
      logger.info("Flushing pending batches...");
      await batchQueue.flushAll();
      
      // Close storage
      if (transactionStorage.initialized) {
        transactionStorage.close();
      }
      
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      clearInterval(statusInterval);
      aleoListener.stopPolling();
      deadLetterQueue.stopRetryProcessor();
      healthAPI.stop();
      
      // Flush pending batches
      logger.info("Flushing pending batches...");
      await batchQueue.flushAll();
      
      // Close storage
      if (transactionStorage.initialized) {
        transactionStorage.close();
      }
      
      process.exit(0);
    });

  } catch (error) {
    logger.error("Fatal error in relayer", error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || 
                     process.argv[1]?.includes('index.js');

if (isMainModule || !process.env.NODE_ENV) {
  main().catch((error) => {
    logger.error("Unhandled error", error);
    process.exit(1);
  });
}

export { main, handleTransferIntent, executeBatch };

