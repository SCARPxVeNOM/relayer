/**
 * Transfer Service - Handles cross-chain transfers
 */

import { ethers } from "ethers";
import { sendETH } from "../eth.js";
import { sendMATIC } from "../polygon.js";
import { CHAINS, CHAIN_NAMES } from "../config.js";
import { createLogger } from "../utils/logger.js";
import { retry } from "../utils/retry.js";

const logger = createLogger("TransferService");

class TransferService {
  /**
   * Execute cross-chain transfer
   * @param {Object} transferData - Transfer data from Aleo
   * @param {number} chainId - Target chain ID
   * @param {string} recipient - Recipient address
   * @param {string} amount - Amount to transfer
   */
  async executeTransfer(chainId, recipient, amount) {
    logger.info(`Executing transfer`, { chainId, recipient, amount });

    try {
      let receipt;

      if (chainId === CHAINS.ETH_SEPOLIA) {
        receipt = await retry(
          () => sendETH(recipient, amount),
          {
            maxAttempts: 3,
            delay: 2000,
            onRetry: (attempt, max, waitTime) => {
              logger.warn(`Retrying ETH transfer (attempt ${attempt}/${max})`, { waitTime });
            },
          }
        );
        logger.info(`✅ ETH transfer successful`, { txHash: receipt.hash });
      } else if (chainId === CHAINS.POLYGON_AMOY) {
        receipt = await retry(
          () => sendMATIC(recipient, amount),
          {
            maxAttempts: 3,
            delay: 2000,
            onRetry: (attempt, max, waitTime) => {
              logger.warn(`Retrying MATIC transfer (attempt ${attempt}/${max})`, { waitTime });
            },
          }
        );
        logger.info(`✅ MATIC transfer successful`, { txHash: receipt.hash });
      } else {
        throw new Error(`Unsupported chain_id: ${chainId}`);
      }

      return {
        success: true,
        chainId,
        chainName: CHAIN_NAMES[chainId],
        recipient,
        amount,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error(`Failed to execute transfer`, error);
      throw error;
    }
  }

  /**
   * Validate transfer data
   */
  validateTransfer(chainId, recipient, amount) {
    const errors = [];

    if (!chainId || ![CHAINS.ETH_SEPOLIA, CHAINS.POLYGON_AMOY].includes(chainId)) {
      errors.push(`Invalid chain_id: ${chainId}`);
    }

    // Validate Ethereum address using ethers.js (handles checksums and format)
    if (!recipient) {
      errors.push(`Recipient address is required`);
    } else {
      try {
        if (!ethers.isAddress(recipient)) {
          errors.push(`Invalid recipient address: ${recipient} (not a valid Ethereum address)`);
        }
      } catch (error) {
        errors.push(`Invalid recipient address: ${recipient} (${error.message})`);
      }
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      errors.push(`Invalid amount: ${amount} (must be a positive number)`);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }
}

export default new TransferService();

