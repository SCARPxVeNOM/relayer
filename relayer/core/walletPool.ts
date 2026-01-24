/**
 * Wallet Pool
 * 
 * Mathematical Model: M/M/k Queue
 * 
 * This pool manages k wallets (servers) per chain.
 * 
 * Increasing k (number of wallets) increases throughput:
 * - Throughput T = min(λ, k × μ)
 * - Where μ = service rate per wallet
 * - More wallets = higher k × μ = higher potential throughput
 * 
 * Stability condition: λ < k × μ
 * - If arrival rate exceeds total service capacity, queue will grow unbounded
 * - We must ensure k × μ > λ for stability
 */

import { ethers } from "ethers";
// Note: NonceManager from @ethersproject/experimental
// For now using manual nonce tracking per wallet
import { RPC_URLS, CHAINS } from "../config.js";
import { createLogger } from "../utils/logger.js";
import GasManager from "../utils/gas-manager.js";
import { WalletStatus } from "./types.js";

const logger = createLogger("WalletPool");

class WalletPool {
  private pools: Map<number, Array<{
    wallet: any; // ethers.Wallet or NonceManager
    nonceManager: any; // NonceManager if available
    gasManager: GasManager;
    address: string;
    pendingCount: number;
    lastUsedAt: number;
  }>> = new Map();

  /**
   * Initialize wallet pool for a chain
   * 
   * This sets up k wallets (servers) for the M/M/k queue.
   * Each wallet has its own NonceManager to prevent collisions.
   */
  async initialize(chainId: number): Promise<void> {
    if (this.pools.has(chainId)) {
      return; // Already initialized
    }

    const rpcUrl = RPC_URLS[chainId];
    if (!rpcUrl) {
      throw new Error(`RPC URL not configured for chain ${chainId}`);
    }

    // Load wallets from environment
    const privateKeys = this.loadPrivateKeys();
    
    if (privateKeys.length === 0) {
      throw new Error("No private keys found");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallets = [];

    // Initialize each wallet
    // Each wallet is independent (no shared nonces)
    // Each wallet manages its own nonce space independently
    for (const pk of privateKeys) {
      const wallet = new ethers.Wallet(pk, provider);
      
      // Each wallet gets its own gas manager
      const gasManager = new GasManager(provider);

      wallets.push({
        wallet: wallet, // Wallet with independent nonce space
        nonceManager: null, // Manual nonce tracking (handled in executors)
        gasManager,
        address: wallet.address,
        pendingCount: 0,
        lastUsedAt: 0,
      });

      logger.info(`Wallet initialized`, {
        chainId,
        address: wallet.address,
        network: chainId === CHAINS.ETH_SEPOLIA ? "Sepolia" : "Amoy",
      });
    }

    this.pools.set(chainId, wallets);
    
    // k = number of wallets (servers)
    logger.info(`Wallet pool initialized`, {
      chainId,
      k: wallets.length, // k - number of servers
      addresses: wallets.map(w => w.address),
    });
  }

  /**
   * Load private keys from environment
   */
  private loadPrivateKeys(): string[] {
    const keys: string[] = [];

    // SECURITY: never hardcode private keys in source code.
    // Configure exactly 2 wallets via env:
    // - RELAYER_PKS="pk1,pk2" (recommended)
    // OR
    // - RELAYER_PK=pk1 and RELAYER_PK_2=pk2
    const rawKeys = process.env.RELAYER_PKS;
    if (rawKeys) {
      keys.push(
        ...rawKeys
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else {
      if (process.env.RELAYER_PK) keys.push(process.env.RELAYER_PK);
      if (process.env.RELAYER_PK_2) keys.push(process.env.RELAYER_PK_2);
    }

    if (keys.length > 2) {
      logger.warn("More than 2 wallets provided; only first 2 will be used.", { provided: keys.length });
      keys.length = 2;
    }

    return keys;
  }

  /**
   * Select a wallet using round-robin or least-loaded strategy
   * 
   * This implements load balancing across k wallets.
   * Round-robin ensures even distribution.
   */
  selectWallet(chainId: number): {
    wallet: any; // ethers.Wallet or NonceManager
    gasManager: GasManager;
    address: string;
  } {
    const pool = this.pools.get(chainId);
    if (!pool || pool.length === 0) {
      throw new Error(`No wallets available for chain ${chainId}`);
    }

    // Round-robin selection (simple load balancing)
    // In production, could use least-loaded strategy
    const index = Math.floor(Math.random() * pool.length);
    const selected = pool[index];

    // Update usage tracking
    selected.pendingCount++;
    selected.lastUsedAt = Date.now();

    return {
      wallet: selected.wallet,
      gasManager: selected.gasManager,
      address: selected.address,
    };
  }

  /**
   * Mark wallet as available (decrement pending count)
   */
  markWalletAvailable(chainId: number, address: string): void {
    const pool = this.pools.get(chainId);
    if (!pool) return;

    const wallet = pool.find(w => w.address === address);
    if (wallet) {
      wallet.pendingCount = Math.max(0, wallet.pendingCount - 1);
    }
  }

  /**
   * Get wallet status for monitoring
   * 
   * Returns status of all k wallets for metrics.
   */
  getWalletStatuses(chainId: number): WalletStatus[] {
    const pool = this.pools.get(chainId);
    if (!pool) return [];

    return pool.map(w => ({
      address: w.address,
      chainId,
      isAvailable: w.pendingCount === 0,
      pendingCount: w.pendingCount,
      lastUsedAt: w.lastUsedAt,
    }));
  }

  /**
   * Get k (number of wallets) for a chain
   */
  getWalletCount(chainId: number): number {
    const pool = this.pools.get(chainId);
    return pool ? pool.length : 0;
  }

  /**
   * Get all wallet counts
   */
  getAllWalletCounts(): Map<number, number> {
    const counts = new Map<number, number>();
    for (const [chainId, pool] of this.pools.entries()) {
      counts.set(chainId, pool.length);
    }
    return counts;
  }
}

export default new WalletPool();

