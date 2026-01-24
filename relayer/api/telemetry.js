/**
 * Telemetry API - Read-only system telemetry
 * 
 * This endpoint provides system status information.
 * READ-ONLY: No state mutations.
 */

import { createLogger } from '../utils/logger.js';
import queue from '../core/queue.js';
import walletPool from '../core/walletPool.js';
import metrics from '../core/metrics.js';
import { CHAINS } from '../config.js';

const logger = createLogger("TelemetryAPI");

/**
 * GET /api/telemetry
 * Get system telemetry
 * 
 * Returns:
 * - bridgeLink: STABLE | DEGRADED
 * - encryptionEngine: LOCKED | UNLOCKED
 * - networkOrientation: Array of network health indicators
 * - zkSystemStatus: ZK system status
 */
export async function getTelemetry(req, res) {
  try {
    // Get queue metrics to determine system health
    const ethMetrics = metrics.getQueueMetrics(CHAINS.ETH_SEPOLIA);
    const polygonMetrics = metrics.getQueueMetrics(CHAINS.POLYGON_AMOY);

    // Determine bridge link status
    // STABLE if both chains are stable (λ < k × μ)
    const bridgeLink = (ethMetrics.stability && polygonMetrics.stability) ? 'STABLE' : 'DEGRADED';

    // Encryption engine status
    // LOCKED if system is operational
    const encryptionEngine = bridgeLink === 'STABLE' ? 'LOCKED' : 'UNLOCKED';

    // Network orientation (health bars)
    // Based on wallet availability and queue health
    const ethWallets = walletPool.getWalletStatuses(CHAINS.ETH_SEPOLIA);
    const polygonWallets = walletPool.getWalletStatuses(CHAINS.POLYGON_AMOY);
    
    const totalWallets = ethWallets.length + polygonWallets.length;
    const availableWallets = [...ethWallets, ...polygonWallets].filter(w => w.isAvailable).length;
    
    // Create network orientation array (9 bars)
    const networkOrientation = Array.from({ length: 9 }, (_, i) => {
      const threshold = (i + 1) / 9;
      return availableWallets / totalWallets >= threshold ? 1 : 0;
    });

    // ZK system status
    const zkSystemStatus = bridgeLink === 'STABLE' ? 'OPERATIONAL' : 'DEGRADED';

    const telemetry = {
      bridgeLink,
      encryptionEngine,
      networkOrientation,
      zkSystemStatus,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(telemetry);
  } catch (error) {
    logger.error('Failed to get telemetry', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

