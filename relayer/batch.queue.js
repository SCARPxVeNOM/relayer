/**
 * Batch Queue - Manages batching of transfer requests
 * Groups requests by chainId and batches based on max size or max wait time
 */

import { createLogger } from "./utils/logger.js";

const logger = createLogger("BatchQueue");

const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || "5");
const MAX_WAIT_TIME = parseInt(process.env.MAX_BATCH_WAIT_TIME || "10000"); // 10 seconds default

class BatchQueue {
  constructor() {
    this.queues = new Map(); // Map<chainId, Array<request>>
    this.timers = new Map(); // Map<chainId, Timer>
    this.batchCallbacks = new Map(); // Map<chainId, Function>
    this.processing = new Set(); // Track chains currently processing batches
  }

  /**
   * Add a transfer request to the queue
   * @param {Object} request - Transfer request with {requestId, chainId, amount, recipient}
   * @param {Function} onBatchReady - Callback when batch is ready
   */
  add(request, onBatchReady) {
    const { chainId } = request;

    // Validate request
    if (!request.requestId || !chainId || !request.amount || !request.recipient) {
      logger.error("Invalid request added to queue", request);
      return;
    }

    // Initialize queue for chain if it doesn't exist
    if (!this.queues.has(chainId)) {
      this.queues.set(chainId, []);
      this.batchCallbacks.set(chainId, onBatchReady);
    }

    // Add request to queue
    const queue = this.queues.get(chainId);
    queue.push(request);

    logger.debug(`Added request to queue`, {
      requestId: request.requestId,
      chainId,
      queueSize: queue.length,
    });

    // Check if batch is ready (max size reached)
    if (queue.length >= MAX_BATCH_SIZE) {
      logger.info(`Batch ready (max size reached)`, {
        chainId,
        batchSize: queue.length,
      });
      this.processBatch(chainId);
      return;
    }

    // Start/reset timer for max wait time
    this.resetTimer(chainId);
  }

  /**
   * Reset timer for a chain
   */
  resetTimer(chainId) {
    // Clear existing timer
    if (this.timers.has(chainId)) {
      clearTimeout(this.timers.get(chainId));
    }

    // Set new timer
    const timer = setTimeout(() => {
      const queue = this.queues.get(chainId);
      if (queue && queue.length > 0) {
        logger.info(`Batch ready (max wait time reached)`, {
          chainId,
          batchSize: queue.length,
        });
        this.processBatch(chainId);
      }
    }, MAX_WAIT_TIME);

    this.timers.set(chainId, timer);
  }

  /**
   * Process a batch for a specific chain
   */
  async processBatch(chainId) {
    // Prevent concurrent processing for the same chain
    if (this.processing.has(chainId)) {
      logger.debug(`Batch already processing for chain ${chainId}`);
      return;
    }

    const queue = this.queues.get(chainId);
    if (!queue || queue.length === 0) {
      return;
    }

    // Mark as processing
    this.processing.add(chainId);

    // Clear timer
    if (this.timers.has(chainId)) {
      clearTimeout(this.timers.get(chainId));
      this.timers.delete(chainId);
    }

    // Extract batch (up to MAX_BATCH_SIZE)
    const batch = queue.splice(0, MAX_BATCH_SIZE);
    
    // Clear queue if empty
    if (queue.length === 0) {
      this.queues.delete(chainId);
    } else {
      // Reset timer for remaining items
      this.resetTimer(chainId);
    }

    logger.info(`Processing batch`, {
      chainId,
      batchSize: batch.length,
      requestIds: batch.map(r => r.requestId),
    });

    // Get callback
    const callback = this.batchCallbacks.get(chainId);
    
    if (callback) {
      // Execute callback asynchronously (don't block)
      setImmediate(async () => {
        try {
          await callback(batch, chainId);
        } catch (error) {
          logger.error(`Batch callback failed for chain ${chainId}`, error);
        } finally {
          // Remove processing flag
          this.processing.delete(chainId);
        }
      });
    } else {
      // No callback, just remove processing flag
      this.processing.delete(chainId);
      logger.warn(`No callback registered for chain ${chainId}`);
    }
  }

  /**
   * Get current queue size for a chain
   */
  getQueueSize(chainId) {
    const queue = this.queues.get(chainId);
    return queue ? queue.length : 0;
  }

  /**
   * Get all queue sizes
   */
  getQueueSizes() {
    const sizes = {};
    for (const [chainId, queue] of this.queues.entries()) {
      sizes[chainId] = queue.length;
    }
    return sizes;
  }

  /**
   * Clear queue for a chain
   */
  clearQueue(chainId) {
    if (this.timers.has(chainId)) {
      clearTimeout(this.timers.get(chainId));
      this.timers.delete(chainId);
    }
    this.queues.delete(chainId);
    this.batchCallbacks.delete(chainId);
    this.processing.delete(chainId);
  }

  /**
   * Clear all queues
   */
  clearAll() {
    for (const chainId of this.queues.keys()) {
      this.clearQueue(chainId);
    }
  }

  /**
   * Force process all pending batches
   */
  async flushAll() {
    const chainIds = Array.from(this.queues.keys());
    logger.info(`Flushing all pending batches`, { chainIds });
    
    for (const chainId of chainIds) {
      await this.processBatch(chainId);
    }
  }
}

export default new BatchQueue();

