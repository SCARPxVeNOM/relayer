/**
 * Polygon Executor - Parallel execution of MATIC transfers with multiple wallets
 * Supports multiple relayer wallets per chain with independent nonce management
 */

import { ethers } from "ethers";
import { RPC_URLS, CHAINS } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { retry } from "./utils/retry.js";
import GasManager from "./utils/gas-manager.js";

const logger = createLogger("PolygonExecutor");

class PolygonExecutor {
  constructor() {
    this.wallets = [];
    this.providers = [];
    this.nonceTrackers = new Map(); // Map<walletAddress, {nonce, pendingCount}>
    this.gasManagers = new Map(); // Map<walletAddress, GasManager>
    this.initialized = false;
  }

  /**
   * Initialize wallets from environment variables
   * Supports multiple wallets: POLYGON_RELAYER_PK, POLYGON_RELAYER_PK_2, etc.
   * Falls back to RELAYER_PK if POLYGON_RELAYER_PK not set
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const rpcUrl = RPC_URLS[CHAINS.POLYGON_AMOY];
    if (!rpcUrl) {
      throw new Error("POLYGON_AMOY_RPC not configured");
    }

    // Collect relayer private keys
    // SECURITY: never hardcode private keys in source code.
    // Configure exactly 2 wallets via env:
    // - RELAYER_PKS="pk1,pk2" (recommended)
    // OR
    // - RELAYER_PK=pk1 and RELAYER_PK_2=pk2
    const privateKeys = [];
    const rawKeys = process.env.RELAYER_PKS;
    if (rawKeys) {
      privateKeys.push(
        ...rawKeys
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else {
      if (process.env.RELAYER_PK) privateKeys.push(process.env.RELAYER_PK);
      if (process.env.RELAYER_PK_2) privateKeys.push(process.env.RELAYER_PK_2);
    }

    if (privateKeys.length < 2) {
      throw new Error("Configure 2 wallets: RELAYER_PKS=\"pk1,pk2\" or RELAYER_PK + RELAYER_PK_2");
    }

    if (privateKeys.length > 2) {
      logger.warn("More than 2 wallets provided; only first 2 will be used.", { provided: privateKeys.length });
      privateKeys.length = 2;
    }

    // Initialize wallets and providers
    for (const pk of privateKeys) {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(pk, provider);
      
      this.wallets.push(wallet);
      this.providers.push(provider);
      
      // Initialize nonce tracker
      const address = wallet.address;
      this.nonceTrackers.set(address, {
        nonce: null,
        pendingCount: 0,
      });

      // Initialize gas manager
      this.gasManagers.set(address, new GasManager(provider));

      logger.info(`Initialized Polygon wallet`, {
        address,
        network: "Amoy",
      });
    }

    // Fetch initial nonces for all wallets
    await this.refreshNonces();

    this.initialized = true;
    logger.info(`Polygon Executor initialized with ${this.wallets.length} wallet(s)`);
  }

  /**
   * Refresh nonces for all wallets
   */
  async refreshNonces() {
    const promises = this.wallets.map(async (wallet) => {
      try {
        const provider = wallet.provider;
        const address = wallet.address;
        const nonce = await provider.getTransactionCount(address, "pending");
        
        const tracker = this.nonceTrackers.get(address);
        if (tracker) {
          tracker.nonce = nonce;
        }
        
        logger.debug(`Refreshed nonce for ${address}`, { nonce });
      } catch (error) {
        logger.error(`Failed to refresh nonce for ${wallet.address}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get next nonce for a wallet
   */
  async getNextNonce(wallet) {
    const address = wallet.address;
    const tracker = this.nonceTrackers.get(address);
    
    if (!tracker) {
      throw new Error(`No nonce tracker for wallet ${address}`);
    }

    // If nonce is null, fetch it
    if (tracker.nonce === null) {
      await this.refreshNonces();
    }

    const nonce = tracker.nonce + tracker.pendingCount;
    tracker.pendingCount++;
    
    return nonce;
  }

  /**
   * Mark nonce as used (after transaction is sent)
   */
  markNonceUsed(wallet) {
    const address = wallet.address;
    const tracker = this.nonceTrackers.get(address);
    
    if (tracker) {
      tracker.nonce = tracker.nonce + 1;
      tracker.pendingCount = Math.max(0, tracker.pendingCount - 1);
    }
  }

  /**
   * Select a wallet for execution (round-robin or based on balance)
   */
  async selectWallet() {
    if (this.wallets.length === 0) {
      throw new Error("No wallets available");
    }

    // Simple round-robin selection
    // In production, you might want to select based on balance or other criteria
    const index = Math.floor(Math.random() * this.wallets.length);
    return this.wallets[index];
  }

  /**
   * Execute a single MATIC transfer
   */
  async executeTransfer(request) {
    const { recipient, amount } = request;

    // Validate address
    if (!ethers.isAddress(recipient)) {
      throw new Error(`Invalid recipient address: ${recipient}`);
    }

    // Select wallet
    const wallet = await this.selectWallet();
    const provider = wallet.provider;

    logger.info(`Executing MATIC transfer`, {
      requestId: request.requestId,
      from: wallet.address,
      to: recipient,
      amount,
    });

    try {
      // Check balance
      const balance = await provider.getBalance(wallet.address);
      const requiredAmount = ethers.parseEther(amount);
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance. Required: ${ethers.formatEther(requiredAmount)} MATIC, Available: ${ethers.formatEther(balance)} MATIC`);
      }

      // Get nonce
      const nonce = await this.getNextNonce(wallet);

      // Get optimized gas price
      const gasManager = this.gasManagers.get(wallet.address);
      const gasOptions = gasManager ? await gasManager.getTransactionGasPrice() : {};

      // Send transaction
      const tx = await wallet.sendTransaction({
        to: recipient,
        value: requiredAmount,
        nonce,
        ...gasOptions,
      });

      // Mark nonce as used
      this.markNonceUsed(wallet);

      logger.info(`Transaction broadcasted`, {
        requestId: request.requestId,
        txHash: tx.hash,
        from: wallet.address,
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      logger.info(`Transaction confirmed`, {
        requestId: request.requestId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        success: true,
        requestId: request.requestId,
        chainId: CHAINS.POLYGON_AMOY,
        recipient,
        amount,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        from: wallet.address,
      };
    } catch (error) {
      logger.error(`MATIC transfer failed for request ${request.requestId}`, error);
      throw error;
    }
  }

  /**
   * Execute a batch of transfers in parallel
   * Each transfer uses a different wallet to avoid nonce collisions
   */
  async executeBatch(batch) {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info(`Executing Polygon batch`, {
      batchSize: batch.length,
      requestIds: batch.map(r => r.requestId),
    });

    // Execute all transfers in parallel using Promise.allSettled
    // This ensures one failure doesn't block others
    const results = await Promise.allSettled(
      batch.map(request => 
        retry(
          () => this.executeTransfer(request),
          {
            maxAttempts: 3,
            delay: 2000,
            onRetry: (attempt, max, waitTime) => {
              logger.warn(`Retrying MATIC transfer for ${request.requestId} (attempt ${attempt}/${max})`, { waitTime });
            },
          }
        )
      )
    );

    // Process results
    const successes = [];
    const failures = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const request = batch[i];

      if (result.status === 'fulfilled') {
        successes.push(result.value);
        logger.info(`✅ MATIC transfer succeeded`, {
          requestId: request.requestId,
          txHash: result.value.txHash,
        });
      } else {
        failures.push({
          requestId: request.requestId,
          error: result.reason,
        });
        logger.error(`❌ MATIC transfer failed`, {
          requestId: request.requestId,
          error: result.reason?.message || result.reason,
        });
      }
    }

    // Refresh nonces after batch execution
    await this.refreshNonces();

    return {
      successes,
      failures,
      total: batch.length,
      successCount: successes.length,
      failureCount: failures.length,
    };
  }

  /**
   * Get wallet status (for monitoring)
   */
  async getWalletStatus() {
    if (!this.initialized) {
      return [];
    }

    const statuses = await Promise.allSettled(
      this.wallets.map(async (wallet) => {
        const provider = wallet.provider;
        const address = wallet.address;
        const balance = await provider.getBalance(address);
        const tracker = this.nonceTrackers.get(address);

        return {
          address,
          balance: ethers.formatEther(balance),
          nonce: tracker?.nonce || null,
          pendingCount: tracker?.pendingCount || 0,
        };
      })
    );

    return statuses
      .filter(s => s.status === 'fulfilled')
      .map(s => s.value);
  }
}

export default new PolygonExecutor();

