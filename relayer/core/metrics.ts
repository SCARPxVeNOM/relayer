/**
 * Metrics Collection
 * 
 * Mathematical Model: M/M/k Queue Metrics
 * 
 * Collects and exposes metrics compatible with Prometheus format.
 * 
 * Key metrics:
 * - λ (lambda): Arrival rate (queue depth)
 * - μ (mu): Service rate per wallet
 * - k: Number of wallets (servers)
 * - T: Throughput = min(λ, k × μ)
 * - Stability: λ < k × μ
 */

import { createLogger } from '../utils/logger.js';
import queue from './queue.js';
import walletPool from './walletPool.js';
import { QueueMetrics } from './types.js';

const logger = createLogger("Metrics");

class Metrics {
  private executionCounts: Map<number, number> = new Map(); // Per chain execution count
  private executionTimes: Map<number, number[]> = new Map(); // Per chain execution times
  private failureCounts: Map<number, number> = new Map(); // Per chain failure count
  private lastReset = Date.now();
  private windowMs = 60000; // 1 minute window

  /**
   * Record execution
   */
  recordExecution(chainId: number, executionTimeMs: number, success: boolean): void {
    const count = this.executionCounts.get(chainId) || 0;
    this.executionCounts.set(chainId, count + 1);

    const times = this.executionTimes.get(chainId) || [];
    times.push(executionTimeMs);
    if (times.length > 1000) {
      times.shift(); // Keep last 1000
    }
    this.executionTimes.set(chainId, times);

    if (!success) {
      const failures = this.failureCounts.get(chainId) || 0;
      this.failureCounts.set(chainId, failures + 1);
    }
  }

  /**
   * Calculate queue metrics
   * 
   * Returns M/M/k queue metrics:
   * - λ: Arrival rate (queue depth)
   * - μ: Service rate per wallet
   * - k: Number of wallets
   * - T: Throughput = min(λ, k × μ)
   * - Stability: λ < k × μ
   */
  getQueueMetrics(chainId: number): QueueMetrics {
    const queueDepth = queue.getQueueDepth(chainId); // λ
    const k = walletPool.getWalletCount(chainId); // k - number of wallets

    // Calculate μ (service rate per wallet)
    // μ = executions per second per wallet
    const executionCount = this.executionCounts.get(chainId) || 0;
    const elapsedSeconds = (Date.now() - this.lastReset) / 1000;
    const totalExecutions = executionCount;
    const mu = elapsedSeconds > 0 ? totalExecutions / elapsedSeconds / k : 0; // μ per wallet

    // Calculate throughput: T = min(λ, k × μ)
    const totalServiceRate = k * mu; // k × μ
    const throughput = Math.min(queueDepth, totalServiceRate);

    // Calculate expected wait time (simplified)
    const waitTime = queueDepth > 0 && totalServiceRate > 0 
      ? queueDepth / totalServiceRate 
      : 0;

    // Stability condition: λ < k × μ
    const stability = queueDepth < totalServiceRate;

    return {
      queueDepth, // λ
      executionRate: mu, // μ
      walletCount: k, // k
      throughput, // T = min(λ, k × μ)
      waitTime,
      stability, // λ < k × μ
    };
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Queue depth (λ) per chain
    const queueDepths = queue.getAllQueueDepths();
    for (const [chainId, depth] of queueDepths.entries()) {
      lines.push(`relayer_queue_depth{chain_id="${chainId}"} ${depth}`);
    }

    // Wallet count (k) per chain
    const walletCounts = walletPool.getAllWalletCounts();
    for (const [chainId, count] of walletCounts.entries()) {
      lines.push(`relayer_wallet_count{chain_id="${chainId}"} ${count}`);
    }

    // Execution rate (μ) per chain
    const elapsedSeconds = (Date.now() - this.lastReset) / 1000;
    for (const [chainId, executionCount] of this.executionCounts.entries()) {
      const k = walletPool.getWalletCount(chainId);
      const mu = elapsedSeconds > 0 ? executionCount / elapsedSeconds / k : 0;
      lines.push(`relayer_execution_rate{chain_id="${chainId}"} ${mu.toFixed(4)}`);
    }

    // Throughput (T) per chain
    for (const chainId of queueDepths.keys()) {
      const metrics = this.getQueueMetrics(chainId);
      lines.push(`relayer_throughput{chain_id="${chainId}"} ${metrics.throughput.toFixed(4)}`);
    }

    // Failure count per chain
    for (const [chainId, failures] of this.failureCounts.entries()) {
      lines.push(`relayer_failures{chain_id="${chainId}"} ${failures}`);
    }

    // Stability per chain
    for (const chainId of queueDepths.keys()) {
      const metrics = this.getQueueMetrics(chainId);
      lines.push(`relayer_stability{chain_id="${chainId}"} ${metrics.stability ? 1 : 0}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Get JSON metrics
   */
  getJSONMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    const queueDepths = queue.getAllQueueDepths();
    for (const chainId of queueDepths.keys()) {
      metrics[`chain_${chainId}`] = {
        ...this.getQueueMetrics(chainId),
        failures: this.failureCounts.get(chainId) || 0,
        walletStatuses: walletPool.getWalletStatuses(chainId),
      };
    }

    return metrics;
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  reset(): void {
    this.executionCounts.clear();
    this.executionTimes.clear();
    this.failureCounts.clear();
    this.lastReset = Date.now();
  }
}

export default new Metrics();

