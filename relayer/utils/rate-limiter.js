/**
 * Rate Limiter - Token bucket algorithm for API rate limiting
 */

import { createLogger } from './logger.js';

const logger = createLogger("RateLimiter");

class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
  }

  /**
   * Refill tokens based on time elapsed
   */
  refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.windowMs) * this.maxRequests);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Check if request can be made immediately
   */
  canMakeRequest() {
    this.refillTokens();
    return this.tokens > 0;
  }

  /**
   * Wait for token availability
   */
  async waitForToken() {
    return new Promise((resolve) => {
      const checkToken = () => {
        this.refillTokens();
        if (this.tokens > 0) {
          this.tokens--;
          resolve();
        } else {
          // Calculate wait time until next token
          const waitTime = this.windowMs / this.maxRequests;
          setTimeout(checkToken, waitTime);
        }
      };
      checkToken();
    });
  }

  /**
   * Execute function with rate limiting
   */
  async execute(fn) {
    if (!this.canMakeRequest()) {
      logger.debug(`Rate limit reached, waiting for token...`);
      await this.waitForToken();
    } else {
      this.tokens--;
    }

    try {
      return await fn();
    } catch (error) {
      // On error, don't consume token (optional - depends on API behavior)
      // this.tokens++; // Uncomment if API doesn't count failed requests
      throw error;
    }
  }
}

/**
 * Create rate limiter for Aleo API
 * Default: 5 requests/second, 100 requests/minute
 */
export function createAleoRateLimiter() {
  const requestsPerSecond = parseInt(process.env.ALEO_RATE_LIMIT_RPS || "5");
  const requestsPerMinute = parseInt(process.env.ALEO_RATE_LIMIT_RPM || "100");
  
  return {
    perSecond: new RateLimiter(requestsPerSecond, 1000),
    perMinute: new RateLimiter(requestsPerMinute, 60000),
  };
}

export default RateLimiter;

