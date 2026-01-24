/**
 * Circuit Breaker - Prevents cascading failures
 */

import { createLogger } from './logger.js';

const logger = createLogger("CircuitBreaker");

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringWindow = options.monitoringWindow || 60000; // 1 minute
    
    this.failureCount = 0;
    this.successCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = null;
    this.failureHistory = [];
  }

  /**
   * Record a failure
   */
  recordFailure() {
    this.failureCount++;
    this.failureHistory.push(Date.now());
    
    // Clean old failures outside monitoring window
    const cutoff = Date.now() - this.monitoringWindow;
    this.failureHistory = this.failureHistory.filter(t => t > cutoff);
    this.failureCount = this.failureHistory.length;

    if (this.failureCount >= this.failureThreshold && this.state === 'CLOSED') {
      this.open();
    }
  }

  /**
   * Record a success
   */
  recordSuccess() {
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      // If we get enough successes in half-open, close the circuit
      if (this.successCount >= 2) {
        this.close();
      }
    } else if (this.state === 'OPEN') {
      // Reset failure count when circuit is open
      this.failureCount = 0;
    }
  }

  /**
   * Open the circuit (stop allowing requests)
   */
  open() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.successCount = 0;
    logger.warn(`Circuit breaker OPEN - blocking requests for ${this.resetTimeout}ms`);
  }

  /**
   * Close the circuit (allow requests)
   */
  close() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = null;
    logger.info("Circuit breaker CLOSED - allowing requests");
  }

  /**
   * Move to half-open state (test if service recovered)
   */
  halfOpen() {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    logger.info("Circuit breaker HALF_OPEN - testing service recovery");
  }

  /**
   * Check if request can be made
   */
  canExecute() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.halfOpen();
        return true;
      }
      return false;
    }

    if (this.state === 'HALF_OPEN') {
      return true;
    }

    return false;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn) {
    if (!this.canExecute()) {
      throw new Error(`Circuit breaker is OPEN - service unavailable`);
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
    };
  }
}

export default CircuitBreaker;

