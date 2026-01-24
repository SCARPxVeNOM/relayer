/**
 * Queue / Buffer Layer
 * 
 * Mathematical Model: M/M/k Queue
 * 
 * This queue implements time-based and size-based batching to reduce effective λ (arrival rate).
 * 
 * Batching reduces effective λ by:
 * - Grouping multiple intents into single execution
 * - Effective execution cost per intent = 1 / b (where b = batch size)
 * - Example: If λ = 10 req/sec and b = 5, effective λ = 10/5 = 2 batches/sec
 * 
 * The queue maintains separate queues per chain to ensure proper batching.
 */

import { TransferIntent, Batch } from './types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger("Queue");

// Configuration
const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || "5"); // b
const BATCH_WINDOW_MS = parseInt(process.env.BATCH_WINDOW_MS || "10000"); // Δt

class Queue {
  private queues: Map<number, TransferIntent[]> = new Map(); // Separate queue per chainId
  private timers: Map<number, NodeJS.Timeout> = new Map();
  private batchCallbacks: Map<number, (batch: Batch) => Promise<void>> = new Map();
  private batchIdCounter = 0;

  /**
   * Add intent to queue
   * 
   * This is the arrival process (λ).
   * Each intent arrival increases queue depth.
   */
  add(intent: TransferIntent, onBatchReady: (batch: Batch) => Promise<void>): void {
    const { chainId } = intent;

    // Initialize queue for chain if needed
    if (!this.queues.has(chainId)) {
      this.queues.set(chainId, []);
      this.batchCallbacks.set(chainId, onBatchReady);
    }

    const queue = this.queues.get(chainId)!;
    queue.push(intent);

    logger.debug(`Intent added to queue`, {
      requestId: intent.requestId,
      chainId,
      queueDepth: queue.length, // Current λ (queue depth)
    });

    // Check if batch is ready (size-based batching)
    // This reduces effective λ by grouping intents
    if (queue.length >= MAX_BATCH_SIZE) {
      logger.info(`Batch ready (size threshold)`, {
        chainId,
        batchSize: queue.length,
        effectiveLambda: queue.length / MAX_BATCH_SIZE, // Reduced effective λ
      });
      this.processBatch(chainId);
      return;
    }

    // Start/reset timer for time-based batching
    this.resetTimer(chainId);
  }

  /**
   * Reset timer for time-based batching
   * 
   * Time-based batching ensures latency doesn't explode.
   * Even if batch size isn't reached, we process after Δt.
   */
  private resetTimer(chainId: number): void {
    // Clear existing timer
    if (this.timers.has(chainId)) {
      clearTimeout(this.timers.get(chainId)!);
    }

    // Set new timer (time window Δt)
    const timer = setTimeout(() => {
      const queue = this.queues.get(chainId);
      if (queue && queue.length > 0) {
        logger.info(`Batch ready (time window)`, {
          chainId,
          batchSize: queue.length,
          windowMs: BATCH_WINDOW_MS,
        });
        this.processBatch(chainId);
      }
    }, BATCH_WINDOW_MS);

    this.timers.set(chainId, timer);
  }

  /**
   * Process batch from queue
   * 
   * This creates a batch and triggers execution.
   * The batch reduces effective λ by grouping intents.
   */
  private processBatch(chainId: number): void {
    const queue = this.queues.get(chainId);
    if (!queue || queue.length === 0) {
      return;
    }

    // Clear timer
    if (this.timers.has(chainId)) {
      clearTimeout(this.timers.get(chainId)!);
      this.timers.delete(chainId);
    }

    // Extract batch (up to MAX_BATCH_SIZE)
    // This is where batching reduces effective λ: b intents → 1 batch
    const batchIntents = queue.splice(0, MAX_BATCH_SIZE);
    
    // Clear queue if empty
    if (queue.length === 0) {
      this.queues.delete(chainId);
    } else {
      // Reset timer for remaining items
      this.resetTimer(chainId);
    }

    // Create batch
    const batch: Batch = {
      id: `batch-${chainId}-${++this.batchIdCounter}`,
      chainId,
      intents: batchIntents,
      createdAt: Date.now(),
      readyAt: Date.now(),
    };

    logger.info(`Processing batch`, {
      batchId: batch.id,
      chainId,
      batchSize: batchIntents.length,
      effectiveLambda: batchIntents.length / MAX_BATCH_SIZE, // Reduced λ
    });

    // Trigger callback asynchronously (non-blocking)
    const callback = this.batchCallbacks.get(chainId);
    if (callback) {
      setImmediate(async () => {
        try {
          await callback(batch);
        } catch (error) {
          logger.error(`Batch callback failed`, error);
        }
      });
    }
  }

  /**
   * Get queue depth (λ - arrival rate indicator)
   */
  getQueueDepth(chainId: number): number {
    const queue = this.queues.get(chainId);
    return queue ? queue.length : 0;
  }

  /**
   * Get all queue depths
   */
  getAllQueueDepths(): Map<number, number> {
    const depths = new Map<number, number>();
    for (const [chainId, queue] of this.queues.entries()) {
      depths.set(chainId, queue.length);
    }
    return depths;
  }

  /**
   * Clear queue for a chain
   */
  clearQueue(chainId: number): void {
    if (this.timers.has(chainId)) {
      clearTimeout(this.timers.get(chainId)!);
      this.timers.delete(chainId);
    }
    this.queues.delete(chainId);
    this.batchCallbacks.delete(chainId);
  }

  /**
   * Flush all pending batches
   */
  async flushAll(): Promise<void> {
    const chainIds = Array.from(this.queues.keys());
    for (const chainId of chainIds) {
      this.processBatch(chainId);
    }
  }
}

export default new Queue();

