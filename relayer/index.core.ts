/**
 * Relayer Core - Main Entry Point
 * 
 * Mathematical Model: M/M/k Queue System
 * 
 * This implements a production-grade relayer following the M/M/k queue model:
 * 
 * - λ (lambda): Arrival rate of intents
 * - μ (mu): Service rate per wallet
 * - k: Number of wallets (servers)
 * - T: Throughput = min(λ, k × μ)
 * - Stability: λ < k × μ
 * 
 * Architecture:
 * 1. Listener: Accepts normalized intents
 * 2. Queue: Batches intents (reduces effective λ)
 * 3. Scheduler: Assigns batches to wallets (distributes across k)
 * 4. Executors: Execute transactions (implements μ)
 */

import "dotenv/config";
import { createLogger } from "./utils/logger.js";
import { CHAINS, CHAIN_NAMES } from "./config.js";
import transactionStorage from "./storage/transaction.db.js";
import healthAPI from "./api/health.js";
import deadLetterQueue from "./utils/dead-letter-queue.js";

// Core modules
import queue from "./core/queue.js";
import scheduler from "./core/scheduler.js";
import walletPool from "./core/walletPool.js";
import ethExecutor from "./core/executor.eth.js";
import polygonExecutor from "./core/executor.polygon.js";
import metrics from "./core/metrics.js";
import { TransferIntent, ExecutionResult } from "./core/types.js";

// Listener (from existing implementation)
import aleoListener from "./aleo.listener.js";

const logger = createLogger("RelayerCore");

/**
 * Handle transfer intent from Aleo listener
 * 
 * This is the arrival process (λ).
 * Each intent is added to the queue.
 */
async function handleTransferIntent(intent: TransferIntent): Promise<void> {
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

    // Check if already processed
    if (transactionStorage.initialized && transactionStorage.isProcessed(intent.requestId)) {
      logger.debug(`Intent ${intent.requestId} already processed`);
      return;
    }

    // Add to queue with batch callback
    const onBatchReady = async (batch: any) => {
      await executeBatch(batch);
    };

    queue.add(intent, onBatchReady);
  } catch (error) {
    logger.error("Failed to handle transfer intent", error);
  }
}

/**
 * Execute a batch
 * 
 * This implements the service process.
 * The scheduler distributes the batch across k wallets in parallel.
 */
async function executeBatch(batch: any): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info(`Executing batch`, {
      batchId: batch.id,
      chainId: batch.chainId,
      batchSize: batch.intents.length,
      chainName: CHAIN_NAMES[batch.chainId],
    });

    let results: ExecutionResult[];

    // Route to appropriate executor
    if (batch.chainId === CHAINS.ETH_SEPOLIA) {
      results = await ethExecutor.executeBatch(batch, scheduler);
    } else if (batch.chainId === CHAINS.POLYGON_AMOY) {
      results = await polygonExecutor.executeBatch(batch, scheduler);
    } else {
      logger.error(`Unsupported chain ID: ${batch.chainId}`);
      return;
    }

    const executionTime = Date.now() - startTime;

    // Record metrics
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    for (const result of results) {
      metrics.recordExecution(
        batch.chainId,
        executionTime / batch.intents.length, // Average time per intent
        result.success
      );
    }

    logger.info(`Batch execution completed`, {
      batchId: batch.id,
      chainId: batch.chainId,
      successCount,
      failureCount,
      total: results.length,
      executionTimeMs: executionTime,
    });

    // Update transaction storage
    if (transactionStorage.initialized) {
      for (const result of results) {
        if (result.success) {
          transactionStorage.updateStatus(result.requestId, 'confirmed', {
            publicChainTxHash: result.txHash,
            processedAt: Date.now(),
          });
        } else {
          transactionStorage.updateStatus(result.requestId, 'failed', {
            errorMessage: result.error,
          });
        }
      }
    }

    // Handle failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      for (const failure of failures) {
        const intent = batch.intents.find((i: TransferIntent) => i.requestId === failure.requestId);
        if (intent && !deadLetterQueue.shouldRetry({ retryCount: 0 })) {
          deadLetterQueue.addFailed(intent, new Error(failure.error));
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to execute batch`, error);
  }
}

/**
 * Main relayer function
 */
async function main() {
  try {
    logger.info("🚀 Starting Multi-Chain Privacy Relayer (M/M/k Queue Model)");
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

    // Initialize wallet pools (k wallets per chain)
    logger.info("Initializing wallet pools...");
    await Promise.all([
      walletPool.initialize(CHAINS.ETH_SEPOLIA),
      walletPool.initialize(CHAINS.POLYGON_AMOY),
    ]);

    // Log k (number of wallets) for each chain
    const ethK = walletPool.getWalletCount(CHAINS.ETH_SEPOLIA);
    const polygonK = walletPool.getWalletCount(CHAINS.POLYGON_AMOY);
    logger.info(`Wallet pools initialized`, {
      ethSepolia: { k: ethK },
      polygonAmoy: { k: polygonK },
    });

    // Start health API
    logger.info("Starting health API...");
    healthAPI.start();

    // Start dead letter queue processor
    logger.info("Starting dead letter queue processor...");
    deadLetterQueue.startRetryProcessor(async (request) => {
      const onBatchReady = async (batch: any) => {
        await executeBatch(batch);
      };
      queue.add(request, onBatchReady);
    });

    // Start Aleo listener
    logger.info("🔍 Starting Aleo transaction monitoring...");
    await aleoListener.startPolling(handleTransferIntent);

    // Log metrics periodically
    const metricsInterval = setInterval(() => {
      const ethMetrics = metrics.getQueueMetrics(CHAINS.ETH_SEPOLIA);
      const polygonMetrics = metrics.getQueueMetrics(CHAINS.POLYGON_AMOY);

      logger.info("Queue Metrics", {
        ethSepolia: {
          λ: ethMetrics.queueDepth,
          μ: ethMetrics.executionRate.toFixed(4),
          k: ethMetrics.walletCount,
          T: ethMetrics.throughput.toFixed(4),
          stable: ethMetrics.stability,
        },
        polygonAmoy: {
          λ: polygonMetrics.queueDepth,
          μ: polygonMetrics.executionRate.toFixed(4),
          k: polygonMetrics.walletCount,
          T: polygonMetrics.throughput.toFixed(4),
          stable: polygonMetrics.stability,
        },
      });
    }, 30000); // Every 30 seconds

    // Graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down gracefully...");
      clearInterval(metricsInterval);
      aleoListener.stopPolling();
      deadLetterQueue.stopRetryProcessor();
      healthAPI.stop();
      await queue.flushAll();
      if (transactionStorage.initialized) {
        transactionStorage.close();
      }
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (error) {
    logger.error("Fatal error in relayer", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || 
    process.argv[1]?.includes('index.core.ts')) {
  main().catch((error) => {
    logger.error("Unhandled error", error);
    process.exit(1);
  });
}

export { main, handleTransferIntent, executeBatch };

