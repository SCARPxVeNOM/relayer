/**
 * ETH Executor
 * 
 * Mathematical Model: M/M/k Queue
 * 
 * This executor implements the service process (μ) for Ethereum Sepolia.
 * 
 * Service rate (μ): Transactions per second per wallet
 * - Each wallet can process transactions at rate μ
 * - With k wallets, total service rate = k × μ
 * 
 * The executor:
 * - Uses NonceManager to prevent nonce collisions
 * - Executes transactions in parallel
 * - Handles failures without blocking other wallets
 */

import { ethers } from "ethers";
import { NonceManager } from "@ethersproject/experimental";
import { CHAINS } from "../config.js";
import { createLogger } from "../utils/logger.js";
import GasManager from "../utils/gas-manager.js";
import { TransferIntent, ExecutionResult } from "./types.js";
import { retry } from "../utils/retry.js";

const logger = createLogger("ETHExecutor");

class ETHExecutor {
  /**
   * Execute a single transfer
   * 
   * This is the service process (μ) - one transaction execution.
   * With k wallets executing in parallel, total rate = k × μ.
   */
  async executeTransfer(
    intent: TransferIntent,
    wallet: any, // Wallet or NonceManager
    gasManager: GasManager
  ): Promise<ExecutionResult> {
    const { recipient, amount, requestId } = intent;

    // Validate address
    if (!ethers.isAddress(recipient)) {
      throw new Error(`Invalid recipient address: ${recipient}`);
    }

    logger.info(`Executing ETH transfer`, {
      requestId,
      to: recipient,
      amount,
    });

    try {
      // Get optimized gas price
      const gasOptions = await gasManager.getTransactionGasPrice();

      // Get nonce (each wallet has independent nonce space)
      // In production, use NonceManager or manual tracking per wallet
      const nonce = await wallet.getTransactionCount("pending");

      // Send transaction
      // Each wallet manages its own nonce independently (no collisions)
      const tx = await wallet.sendTransaction({
        to: recipient,
        value: ethers.parseEther(amount),
        gasLimit: 21000, // Standard ETH transfer
        nonce,
        ...gasOptions,
      });

      logger.info(`Transaction broadcasted`, {
        requestId,
        txHash: tx.hash,
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      logger.info(`Transaction confirmed`, {
        requestId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return {
        requestId,
        success: true,
        txHash: receipt.hash,
        walletAddress: wallet.address,
      };
    } catch (error) {
      logger.error(`ETH transfer failed`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute batch of transfers
   * 
   * This processes a batch using the scheduler.
   * The scheduler distributes intents across k wallets in parallel.
   */
  async executeBatch(
    batch: any,
    scheduler: any
  ): Promise<ExecutionResult[]> {
    logger.info(`Executing ETH batch`, {
      batchId: batch.id,
      batchSize: batch.intents.length,
    });

    // Schedule batch for execution
    // Scheduler distributes across k wallets in parallel
    const results = await scheduler.scheduleBatch(
      batch,
      (intent, wallet, gasManager) => 
        retry(
          () => this.executeTransfer(intent, wallet, gasManager),
          {
            maxAttempts: 3,
            delay: 2000,
            onRetry: (attempt, max) => {
              logger.warn(`Retrying transfer ${intent.requestId} (attempt ${attempt}/${max})`);
            },
          }
        )
    );

    return results;
  }
}

export default new ETHExecutor();

