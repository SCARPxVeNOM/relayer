/**
 * Health Check API - Simple HTTP server for health checks and metrics
 */

import http from 'http';
import { createLogger } from '../utils/logger.js';
import transactionStorage from '../storage/transaction.db.js';
import batchQueue from '../batch.queue.js';
import ethExecutor from '../executor.eth.js';
import polygonExecutor from '../executor.polygon.js';

const logger = createLogger("HealthAPI");

class HealthAPI {
  constructor() {
    this.server = null;
    // Render assigns PORT dynamically, fallback to HEALTH_PORT or 3001
    this.port = parseInt(process.env.PORT || process.env.HEALTH_PORT || "3001");
  }

  /**
   * Start health check server
   */
  start() {
    this.server = http.createServer(async (req, res) => {
      try {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname === '/health') {
          await this.handleHealth(req, res);
        } else if (url.pathname === '/metrics') {
          await this.handleMetrics(req, res);
        } else if (url.pathname === '/metrics/prometheus') {
          await this.handlePrometheusMetrics(req, res);
        } else if (url.pathname === '/status') {
          await this.handleStatus(req, res);
        } else if (url.pathname === '/api/telemetry') {
          const { getTelemetry } = await import('./telemetry.js');
          await getTelemetry(req, res);
        } else if (url.pathname === '/api/session/init' && req.method === 'POST') {
          const { initSession } = await import('./session.js');
          await initSession(req, res);
        } else if (url.pathname === '/api/intent' && req.method === 'POST') {
          const { createIntent } = await import('./intent.js');
          await createIntent(req, res);
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (error) {
        logger.error("Health API error", error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    this.server.listen(this.port, () => {
      logger.info(`Health API server started on port ${this.port}`);
    });
  }

  /**
   * Handle health check
   */
  async handleHealth(req, res) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };

    res.writeHead(200);
    res.end(JSON.stringify(health, null, 2));
  }

  /**
   * Handle metrics endpoint
   */
  async handleMetrics(req, res) {
    try {
      const queueSizes = batchQueue.getQueueSizes?.() || {};

      // Get wallet statuses from executors (best-effort)
      const ethStatus = await ethExecutor.getWalletStatus().catch(() => []);
      const polygonStatus = await polygonExecutor.getWalletStatus().catch(() => []);

      // Get transaction stats
      const txStats = transactionStorage.initialized ? transactionStorage.getStats() : null;

      const metricsData = {
        queues: queueSizes,
        wallets: {
          eth: {
            count: ethStatus.length,
            statuses: ethStatus,
          },
          polygon: {
            count: polygonStatus.length,
            statuses: polygonStatus,
          },
        },
        transactions: txStats,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      };

      res.writeHead(200);
      res.end(JSON.stringify(metricsData, null, 2));
    } catch (error) {
      logger.error("Failed to get metrics", error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Prometheus-compatible plaintext metrics.
   * This is intentionally lightweight for Render deploys.
   */
  async handlePrometheusMetrics(req, res) {
    try {
      const queueSizes = batchQueue.getQueueSizes?.() || {};
      const ethStatus = await ethExecutor.getWalletStatus().catch(() => []);
      const polygonStatus = await polygonExecutor.getWalletStatus().catch(() => []);

      const lines = [];
      lines.push(`# HELP relayer_queue_depth Current in-memory queue depth per chain`);
      lines.push(`# TYPE relayer_queue_depth gauge`);
      for (const [chainId, depth] of Object.entries(queueSizes)) {
        lines.push(`relayer_queue_depth{chain_id="${chainId}"} ${Number(depth) || 0}`);
      }

      lines.push(`# HELP relayer_wallet_count Wallet count per chain`);
      lines.push(`# TYPE relayer_wallet_count gauge`);
      lines.push(`relayer_wallet_count{chain_id="11155111"} ${ethStatus.length}`);
      lines.push(`relayer_wallet_count{chain_id="80002"} ${polygonStatus.length}`);

      const ethActive = ethStatus.filter((w) => w.status === "active").length;
      const polygonActive = polygonStatus.filter((w) => w.status === "active").length;
      lines.push(`# HELP relayer_wallet_active Active wallet count per chain`);
      lines.push(`# TYPE relayer_wallet_active gauge`);
      lines.push(`relayer_wallet_active{chain_id="11155111"} ${ethActive}`);
      lines.push(`relayer_wallet_active{chain_id="80002"} ${polygonActive}`);

      res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      res.writeHead(200);
      res.end(lines.join("\n") + "\n");
    } catch (error) {
      logger.error("Failed to get Prometheus metrics", error);
      res.writeHead(500);
      res.end("error\n");
    }
  }

  /**
   * Handle status endpoint
   */
  async handleStatus(req, res) {
    try {
      const queueSizes = batchQueue.getQueueSizes?.() || {};
      const ethStatus = await ethExecutor.getWalletStatus().catch(() => []);
      const polygonStatus = await polygonExecutor.getWalletStatus().catch(() => []);
      
      const status = {
        relayer: {
          status: 'running',
          uptime: process.uptime(),
        },
        queues: queueSizes,
        wallets: {
          eth: {
            count: ethStatus.length,
            statuses: ethStatus,
          },
          polygon: {
            count: polygonStatus.length,
            statuses: polygonStatus,
          },
        },
        storage: {
          initialized: transactionStorage.initialized,
        },
      };

      res.writeHead(200);
      res.end(JSON.stringify(status, null, 2));
    } catch (error) {
      logger.error("Failed to get status", error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Stop health check server
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info("Health API server stopped");
      });
    }
  }
}

export default new HealthAPI();

