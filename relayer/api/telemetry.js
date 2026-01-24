/**
 * Telemetry API - Read-only system telemetry
 * 
 * This endpoint provides system status information.
 * READ-ONLY: No state mutations.
 */

import { createLogger } from '../utils/logger.js';
import { CHAINS } from '../config.js';
import batchQueue from '../batch.queue.js';
import ethExecutor from '../executor.eth.js';
import polygonExecutor from '../executor.polygon.js';
import { sendJson } from './http.js';

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
    // Read-only, best-effort telemetry derived from current executor + queue state.
    const queueSizes = batchQueue.getQueueSizes?.() || {};
    const ethStatus = (await ethExecutor.getWalletStatus().catch(() => [])) || [];
    const polygonStatus = (await polygonExecutor.getWalletStatus().catch(() => [])) || [];

    const totalWallets = ethStatus.length + polygonStatus.length;
    const availableWallets =
      [...ethStatus, ...polygonStatus].filter((w) => w.status === "active").length;

    // Bridge link is STABLE if wallets exist and at least one is active per chain.
    const ethOk = ethStatus.some((w) => w.status === "active");
    const polygonOk = polygonStatus.some((w) => w.status === "active");
    const bridgeLink = ethOk && polygonOk ? "STABLE" : "DEGRADED";

    // Encryption engine reflects whether the relayer subsystem is operational.
    const encryptionEngine = bridgeLink === "STABLE" ? "LOCKED" : "UNLOCKED";

    // 9-bar health display based on % of active wallets.
    const ratio = totalWallets > 0 ? availableWallets / totalWallets : 0;
    const networkOrientation = Array.from({ length: 9 }, (_, i) => (ratio >= (i + 1) / 9 ? 1 : 0));

    const zkSystemStatus = bridgeLink === "STABLE" ? "OPERATIONAL" : "DEGRADED";

    const telemetry = {
      bridgeLink,
      encryptionEngine,
      networkOrientation,
      zkSystemStatus,
      queues: queueSizes,
      timestamp: new Date().toISOString(),
    };

    sendJson(res, 200, telemetry);
  } catch (error) {
    logger.error('Failed to get telemetry', error);
    sendJson(res, 500, { error: error?.message || 'Internal server error' });
  }
}

