import { ethers } from "ethers";
import { RPC_URLS, CHAINS } from "./config.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger("Polygon");

/**
 * Send MATIC on Polygon Amoy testnet
 * @param {string} to - Recipient address
 * @param {string} amount - Amount in MATIC (as string, e.g., "0.01")
 * @returns {Promise<ethers.TransactionResponse>} Transaction response
 */
export async function sendMATIC(to, amount) {
  if (!process.env.RELAYER_PK) {
    throw new Error("RELAYER_PK environment variable is required");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URLS[CHAINS.POLYGON_AMOY]);
  const wallet = new ethers.Wallet(process.env.RELAYER_PK, provider);

  // Validate address
  if (!ethers.isAddress(to)) {
    throw new Error(`Invalid recipient address: ${to}`);
  }

  logger.info(`Initiating MATIC transfer`, { to, amount, network: "Amoy" });

  try {
    // Check balance before sending
    const balance = await provider.getBalance(wallet.address);
    const requiredAmount = ethers.parseEther(amount);
    
    if (balance < requiredAmount) {
      throw new Error(`Insufficient balance. Required: ${ethers.formatEther(requiredAmount)} MATIC, Available: ${ethers.formatEther(balance)} MATIC`);
    }

    const tx = await wallet.sendTransaction({
      to,
      value: requiredAmount,
    });

    logger.info(`Transaction broadcasted`, { txHash: tx.hash });

    const receipt = await tx.wait();
    logger.info(`Transaction confirmed`, {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });

    return receipt;
  } catch (error) {
    logger.error(`MATIC transfer failed`, error);
    throw error;
  }
}

