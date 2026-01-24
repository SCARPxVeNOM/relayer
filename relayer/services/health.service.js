/**
 * Health check service
 */

import { ethers } from "ethers";
import { RPC_URLS, CHAINS } from "../config/chains.js";
import aleoService from "./aleo.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("HealthCheck");

class HealthService {
  /**
   * Check relayer wallet balance on all chains
   */
  async checkBalances() {
    const balances = {};
    
    if (!process.env.RELAYER_PK) {
      return { error: "RELAYER_PK not set" };
    }

    try {
      // Check ETH Sepolia balance
      const ethProvider = new ethers.JsonRpcProvider(RPC_URLS[CHAINS.ETH_SEPOLIA]);
      const wallet = new ethers.Wallet(process.env.RELAYER_PK);
      const ethBalance = await ethProvider.getBalance(wallet.address);
      balances.ethereumSepolia = {
        address: wallet.address,
        balance: ethers.formatEther(ethBalance),
        symbol: "ETH",
      };

      // Check Polygon Amoy balance
      const polygonProvider = new ethers.JsonRpcProvider(RPC_URLS[CHAINS.POLYGON_AMOY]);
      const maticBalance = await polygonProvider.getBalance(wallet.address);
      balances.polygonAmoy = {
        address: wallet.address,
        balance: ethers.formatEther(maticBalance),
        symbol: "MATIC",
      };

      return balances;
    } catch (error) {
      logger.error("Failed to check balances", error);
      return { error: error.message };
    }
  }

  /**
   * Check Aleo connection
   */
  async checkAleoConnection() {
    try {
      const blockHeight = await aleoService.getLatestBlockHeight();
      return {
        connected: true,
        latestBlockHeight: blockHeight,
        programId: process.env.ALEO_PROGRAM_ID || "privacy_box_mvp.aleo",
      };
    } catch (error) {
      logger.warn("Aleo connection check failed (optional)", error.message);
      return {
        connected: false,
        error: error.message,
        note: "Aleo monitoring is optional - simulation mode works independently",
      };
    }
  }

  /**
   * Full health check
   */
  async fullHealthCheck() {
    const [balances, aleoStatus] = await Promise.all([
      this.checkBalances(),
      this.checkAleoConnection(),
    ]);

    // System is healthy if balances are available (Aleo is optional)
    const isHealthy = !balances.error && 
                     balances.ethereumSepolia && 
                     balances.polygonAmoy;

    return {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      balances,
      aleo: aleoStatus,
      configuration: {
        simulationMode: process.env.ENABLE_SIMULATION === "true",
        logLevel: process.env.LOG_LEVEL || "INFO",
      },
    };
  }
}

export default new HealthService();

