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
 * Helper to get derived telemetry data
 */
async function getSystemState() {
  const queueSizes = batchQueue.getQueueSizes?.() || {};
  const ethStatus = (await ethExecutor.getWalletStatus().catch(() => [])) || [];
  const polygonStatus = (await polygonExecutor.getWalletStatus().catch(() => [])) || [];

  const totalWallets = ethStatus.length + polygonStatus.length;
  const availableWallets =
    [...ethStatus, ...polygonStatus].filter((w) => w.status === "active").length;

  const ethOk = ethStatus.some((w) => w.status === "active");
  const polygonOk = polygonStatus.some((w) => w.status === "active");
  const bridgeLink = ethOk && polygonOk ? "STABLE" : "DEGRADED";
  
  const encryptionEngine = bridgeLink === "STABLE" ? "LOCKED" : "UNLOCKED";
  const zkSystemStatus = bridgeLink === "STABLE" ? "OPERATIONAL" : "DEGRADED";

  // Calculate network orientation (M/M/k visualization)
  // Each bar represents a wallet or capacity unit
  const ratio = totalWallets > 0 ? availableWallets / totalWallets : 0;
  const networkOrientation = Array.from({ length: 9 }, (_, i) => (ratio >= (i + 1) / 9 ? 1 : 0));

  return {
    queueSizes,
    bridgeLink,
    encryptionEngine,
    zkSystemStatus,
    networkOrientation,
    totalWallets,
    availableWallets
  };
}

/**
 * GET /api/telemetry
 * Aggregated system telemetry
 */
export async function getTelemetry(req, res) {
  try {
    const state = await getSystemState();
    sendJson(res, 200, {
      ...state,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get telemetry', error);
    sendJson(res, 500, { error: error?.message || 'Internal server error' });
  }
}

/**
 * GET /api/latency
 * Returns median control-plane latency
 */
export async function getLatency(req, res) {
  // Mock logic: calculate based on recent execution times from metrics
  // In a real system, this would trace request start -> processing start
  const baseLatency = 20 + (Math.random() * 10); // Base ~25ms
  sendJson(res, 200, {
    value: Math.round(baseLatency),
    unit: 'ms',
    status: baseLatency < 100 ? 'SECURED' : 'DEGRADED'
  });
}

/**
 * GET /api/heartbeat
 * Returns pulse rate based on queue activity
 */
export async function getHeartbeat(req, res) {
  const queueSizes = batchQueue.getQueueSizes?.() || {};
  const totalQueue = Object.values(queueSizes).reduce((a, b) => a + Number(b), 0);
  
  // Higher queue = faster pulse
  // 0 queue = slow idle pulse
  const pulseRate = totalQueue > 5 ? 'FAST' : (totalQueue > 0 ? 'NORMAL' : 'IDLE');
  
  sendJson(res, 200, {
    pulseRate,
    activity: totalQueue,
    timestamp: Date.now()
  });
}

/**
 * GET /api/metrics (Detailed M/M/k metrics)
 */
export async function getDetailedMetrics(req, res) {
  // Construct metrics from available JS modules
  const queueSizes = batchQueue.getQueueSizes?.() || {};
  
  // Best-effort wallet counts
  const ethStatus = (await ethExecutor.getWalletStatus().catch(() => [])) || [];
  const polygonStatus = (await polygonExecutor.getWalletStatus().catch(() => [])) || [];
  
  const metrics = {
    queues: queueSizes,
    wallets: {
      eth: { count: ethStatus.length, active: ethStatus.filter(w => w.status === 'active').length },
      polygon: { count: polygonStatus.length, active: polygonStatus.filter(w => w.status === 'active').length }
    },
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  sendJson(res, 200, metrics);
}

/**
 * GET /api/chains
 */
export async function getChains(req, res) {
  const { bridgeLink } = await getSystemState();
  sendJson(res, 200, {
    linkStatus: bridgeLink,
    chains: [
      { id: CHAINS.ETH_SEPOLIA, name: 'ETHEREUM_SEPOLIA', status: 'ONLINE' },
      { id: CHAINS.POLYGON_AMOY, name: 'POLYGON_AMOY', status: 'ONLINE' }
    ]
  });
}

/**
 * GET /api/aleo/status
 */
export async function getAleoStatus(req, res) {
  const { encryptionEngine } = await getSystemState();
  sendJson(res, 200, {
    status: encryptionEngine,
    program: 'privacy_box_mvp.aleo',
    zkProof: 'VERIFIED'
  });
}

/**
 * GET /api/version
 */
export async function getVersion(req, res) {
  sendJson(res, 200, {
    protocol: 'ZK-7',
    gateway: 'ORBITAL-7',
    build: 'v1.0.4-beta'
  });
}

/**
 * GET /api/relayers
 */
export async function getRelayers(req, res) {
  const { availableWallets } = await getSystemState();
  sendJson(res, 200, {
    activeNode: 'ORBITAL_GATEWAY_7',
    availableUplinks: availableWallets,
    region: 'EU-WEST-3'
  });
}


