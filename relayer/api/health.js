/**
 * Health Check API - Simple HTTP server for health checks and metrics
 */

import http from 'http';
import { createLogger } from '../utils/logger.js';
import transactionStorage from '../storage/transaction.db.js';

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
      // Import core modules dynamically
      const queue = (await import('../core/queue.js')).default;
      const metrics = (await import('../core/metrics.js')).default;
      const walletPool = (await import('../core/walletPool.js')).default;
      
      const queueSizes = Object.fromEntries(queue.getAllQueueDepths());
      
      // Get wallet statuses
      const ethStatus = walletPool.getWalletStatuses(11155111);
      const polygonStatus = walletPool.getWalletStatuses(80002);

      // Get transaction stats
      const txStats = transactionStorage.initialized ? transactionStorage.getStats() : null;

      // Get M/M/k queue metrics
      const queueMetrics = metrics.getJSONMetrics();

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
        queueMetrics, // M/M/k queue metrics
        prometheus: metrics.getPrometheusMetrics(),
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
   * Handle status endpoint
   */
  async handleStatus(req, res) {
    try {
      const queue = (await import('../core/queue.js')).default;
      const walletPool = (await import('../core/walletPool.js')).default;
      const scheduler = (await import('../core/scheduler.js')).default;
      
      const queueSizes = Object.fromEntries(queue.getAllQueueDepths());
      const walletCounts = Object.fromEntries(walletPool.getAllWalletCounts());
      const schedulerStatus = scheduler.getStatus();
      
      const status = {
        relayer: {
          status: 'running',
          uptime: process.uptime(),
        },
        queues: queueSizes,
        wallets: {
          eth: {
            count: walletCounts['11155111'] || 0,
            statuses: walletPool.getWalletStatuses(11155111),
          },
          polygon: {
            count: walletCounts['80002'] || 0,
            statuses: walletPool.getWalletStatuses(80002),
          },
        },
        scheduler: schedulerStatus,
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

