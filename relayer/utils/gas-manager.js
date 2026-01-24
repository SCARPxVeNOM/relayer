/**
 * Gas Manager - Dynamic gas price management
 */

import { ethers } from "ethers";
import { createLogger } from "./logger.js";

const logger = createLogger("GasManager");

class GasManager {
  constructor(provider) {
    this.provider = provider;
    this.lastGasPrice = null;
    this.updateInterval = 60000; // 1 minute
    this.lastUpdate = 0;
    this.multiplier = parseFloat(process.env.GAS_PRICE_MULTIPLIER || "1.1"); // 10% buffer
  }

  /**
   * Get current gas price with multiplier
   */
  async getGasPrice() {
    const now = Date.now();
    
    // Update gas price if needed
    if (!this.lastGasPrice || (now - this.lastUpdate) > this.updateInterval) {
      try {
        const feeData = await this.provider.getFeeData();
        
        // Use maxFeePerGas for EIP-1559, or gasPrice for legacy
        const baseGasPrice = feeData.maxFeePerGas || feeData.gasPrice;
        
        if (baseGasPrice) {
          // Apply multiplier and round up
          this.lastGasPrice = baseGasPrice * BigInt(Math.floor(this.multiplier * 100)) / 100n;
          this.lastUpdate = now;
          
          logger.debug(`Gas price updated`, {
            base: ethers.formatUnits(baseGasPrice, "gwei"),
            adjusted: ethers.formatUnits(this.lastGasPrice, "gwei"),
            multiplier: this.multiplier,
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch gas price, using cached value`, error);
        if (!this.lastGasPrice) {
          // Fallback to a default if we don't have a cached value
          this.lastGasPrice = ethers.parseUnits("20", "gwei"); // Default for testnets
        }
      }
    }

    return this.lastGasPrice;
  }

  /**
   * Get gas price for transaction (with EIP-1559 support)
   */
  async getTransactionGasPrice() {
    const feeData = await this.provider.getFeeData();
    
    // Prefer EIP-1559 if available
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      const maxFee = feeData.maxFeePerGas * BigInt(Math.floor(this.multiplier * 100)) / 100n;
      const maxPriorityFee = feeData.maxPriorityFeePerGas * BigInt(Math.floor(this.multiplier * 100)) / 100n;
      
      return {
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: maxPriorityFee,
      };
    }

    // Fallback to legacy gasPrice
    const gasPrice = await this.getGasPrice();
    return { gasPrice };
  }
}

export default GasManager;

