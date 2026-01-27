/**
 * Transaction Storage - Persistent storage for processed transactions
 * Uses SQLite for lightweight, file-based persistence
 */

import Database from 'better-sqlite3';
import { createLogger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const logger = createLogger("TransactionDB");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TransactionStorage {
  constructor() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/transactions.db');

    // Create parent directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info('Created database directory', { path: dbDir });
    }

    this.db = new Database(dbPath);
    this.initialized = false;
  }

  /**
   * Initialize database schema
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Create transactions table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS processed_transactions (
          tx_id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          chain_id INTEGER NOT NULL,
          amount TEXT NOT NULL,
          recipient TEXT NOT NULL,
          status TEXT NOT NULL,
          aleo_tx_id TEXT,
          public_chain_tx_hash TEXT,
          error_message TEXT,
          created_at INTEGER NOT NULL,
          processed_at INTEGER,
          retry_count INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_request_id ON processed_transactions(request_id);
        CREATE INDEX IF NOT EXISTS idx_status ON processed_transactions(status);
        CREATE INDEX IF NOT EXISTS idx_created_at ON processed_transactions(created_at);
      `);

      // Create metrics table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric_name TEXT NOT NULL,
          metric_value REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          metadata TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_metric_name ON metrics(metric_name);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON metrics(timestamp);
      `);

      this.initialized = true;
      logger.info("Transaction storage initialized");
    } catch (error) {
      logger.error("Failed to initialize transaction storage", error);
      throw error;
    }
  }

  /**
   * Check if transaction has been processed
   */
  isProcessed(txId) {
    const stmt = this.db.prepare('SELECT tx_id FROM processed_transactions WHERE tx_id = ?');
    const result = stmt.get(txId);
    return !!result;
  }

  /**
   * Mark transaction as processed
   */
  markProcessed(txData) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO processed_transactions 
      (tx_id, request_id, chain_id, amount, recipient, status, aleo_tx_id, created_at, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    stmt.run(
      txData.txId,
      txData.requestId,
      txData.chainId,
      txData.amount,
      txData.recipient,
      txData.status || 'pending',
      txData.aleoTxId || null,
      txData.createdAt || now,
      txData.processedAt || now
    );
  }

  /**
   * Update transaction status
   */
  updateStatus(txId, status, updates = {}) {
    const fields = ['status = ?'];
    const values = [status];

    if (updates.publicChainTxHash) {
      fields.push('public_chain_tx_hash = ?');
      values.push(updates.publicChainTxHash);
    }

    if (updates.errorMessage) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }

    if (updates.processedAt) {
      fields.push('processed_at = ?');
      values.push(updates.processedAt);
    }

    fields.push('retry_count = retry_count + 1');
    values.push(txId);

    const stmt = this.db.prepare(`UPDATE processed_transactions SET ${fields.join(', ')} WHERE tx_id = ?`);
    stmt.run(...values);
  }

  /**
   * Get failed transactions for retry
   */
  getFailedTransactions(maxRetries = 3) {
    const stmt = this.db.prepare(`
      SELECT * FROM processed_transactions 
      WHERE status = 'failed' AND retry_count < ?
      ORDER BY created_at ASC
      LIMIT 100
    `);
    return stmt.all(maxRetries);
  }

  /**
   * Get transaction statistics
   */
  getStats() {
    const stats = this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(CASE WHEN processed_at IS NOT NULL THEN 1 ELSE 0 END) as processed_count
      FROM processed_transactions
      GROUP BY status
    `).all();

    const total = this.db.prepare('SELECT COUNT(*) as count FROM processed_transactions').get();

    return {
      total: total.count,
      byStatus: stats.reduce((acc, row) => {
        acc[row.status] = {
          count: row.count,
          processed: row.processed_count,
        };
        return acc;
      }, {}),
    };
  }

  /**
   * Record metric
   */
  recordMetric(metricName, value, metadata = null) {
    const stmt = this.db.prepare(`
      INSERT INTO metrics (metric_name, metric_value, timestamp, metadata)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(metricName, value, Date.now(), metadata ? JSON.stringify(metadata) : null);
  }

  /**
   * Get recent metrics
   */
  getMetrics(metricName, since = null) {
    let query = 'SELECT * FROM metrics WHERE metric_name = ?';
    const params = [metricName];

    if (since) {
      query += ' AND timestamp >= ?';
      params.push(since);
    }

    query += ' ORDER BY timestamp DESC LIMIT 1000';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Cleanup old records (optional maintenance)
   */
  cleanup(daysToKeep = 30) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const txStmt = this.db.prepare('DELETE FROM processed_transactions WHERE created_at < ?');
    const txDeleted = txStmt.run(cutoff).changes;

    const metricStmt = this.db.prepare('DELETE FROM metrics WHERE timestamp < ?');
    const metricDeleted = metricStmt.run(cutoff).changes;

    logger.info(`Cleanup completed`, { txDeleted, metricDeleted });
    return { txDeleted, metricDeleted };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      logger.info("Transaction storage closed");
    }
  }
}

export default new TransactionStorage();

