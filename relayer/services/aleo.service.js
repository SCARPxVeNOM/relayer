/**
 * Aleo Service - Connects to Aleo testnet and monitors program transactions
 * Updated to use Aleo API v2 endpoints
 * Docs: https://developer.aleo.org/apis/v2/get-latest-height
 */

import fetch from "node-fetch";

// Updated to v2 API base URL
const ALEO_ENDPOINT = process.env.ALEO_RPC || "https://api.explorer.provable.com/v2/testnet";
const PROGRAM_ID = "privacy_box_mvp.aleo";
const POLL_INTERVAL = 10000; // 10 seconds

class AleoService {
  constructor() {
    this.lastBlockHeight = null;
    this.isPolling = false;
    this.listeners = [];
  }

  /**
   * Get latest block height
   * Uses Aleo API v2: GET /block/height/latest
   * Docs: https://developer.aleo.org/apis/v2/get-latest-height
   */
  async getLatestBlockHeight() {
    try {
      // Try v2 endpoints first
      const endpoints = [
        `${ALEO_ENDPOINT}/block/height/latest`,
        `https://api.explorer.provable.com/v2/testnet/block/height/latest`,
        `https://api.explorer.provable.com/v2/testnet3/block/height/latest`,
        // Fallback: try /block/latest and extract height
        `${ALEO_ENDPOINT}/block/latest`,
        `https://api.explorer.provable.com/v2/testnet/block/latest`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { timeout: 10000 });
          if (response.ok) {
            const data = await response.json();
            
            // /block/height/latest returns a number
            if (typeof data === "number") return data;
            if (typeof data === "string" && /^\d+$/.test(data)) return parseInt(data, 10);
            
            // /block/latest returns a block object; try to extract height
            const maybeHeight = data?.height ?? data?.block?.height ?? data?.header?.metadata?.height ?? data?.block?.header?.metadata?.height ?? data?.metadata?.height ?? null;
            if (typeof maybeHeight === "number") return maybeHeight;
            if (typeof maybeHeight === "string" && /^\d+$/.test(maybeHeight)) return parseInt(maybeHeight, 10);
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error("All endpoint attempts failed");
    } catch (error) {
      throw new Error(`Failed to get block height: ${error.message}`);
    }
  }

  /**
   * Get transactions for a specific program
   * Uses Aleo API v2: GET /block/:height/transactions
   * Docs: https://developer.aleo.org/apis/v2/transactions-by-block-height
   */
  async getProgramTransactions(blockHeight) {
    try {
      const endpoints = [
        `${ALEO_ENDPOINT}/block/${blockHeight}/transactions`,
        `https://api.explorer.provable.com/v2/testnet/block/${blockHeight}/transactions`,
        `https://api.explorer.provable.com/v2/testnet3/block/${blockHeight}/transactions`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            
            // Filter transactions for our program
            const programTxs = (data.transactions || []).filter(tx => {
              if (tx.type === "execute") {
                return tx.execution?.transitions?.some(
                  t => t.program === PROGRAM_ID && t.function === "request_transfer"
                );
              }
              return false;
            });

            return programTxs;
          }
        } catch (e) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      console.warn(`Failed to get transactions for block ${blockHeight}: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse transaction to extract transfer data
   * Note: Private data is hidden, so we extract what's available
   */
  parseTransaction(tx) {
    try {
      const transition = tx.execution?.transitions?.find(
        t => t.program === PROGRAM_ID && t.function === "request_transfer"
      );

      if (!transition) return null;

      // Extract public inputs/outputs
      // Private data (amount, chain_id, dest) is not visible in transactions
      // In production, this would require decrypting with user's view key
      return {
        transactionId: tx.id,
        blockHeight: tx.blockHeight,
        timestamp: tx.timestamp || Date.now(),
        program: PROGRAM_ID,
        function: "request_transfer",
        // Note: Private parameters are not accessible without view key
        // This is a placeholder for the actual implementation
        hasPrivateTransfer: true,
      };
    } catch (error) {
      console.error("Error parsing transaction:", error);
      return null;
    }
  }

  /**
   * Start polling for new transactions
   */
  async startPolling(callback) {
    if (this.isPolling) {
      console.warn("Aleo polling already started");
      return;
    }

    this.isPolling = true;
    console.log(`🔍 Starting Aleo transaction monitoring for ${PROGRAM_ID}...`);

    try {
      this.lastBlockHeight = await this.getLatestBlockHeight();
      console.log(`📊 Starting from block height: ${this.lastBlockHeight}`);
    } catch (error) {
      console.error("Failed to get initial block height:", error.message);
      this.isPolling = false;
      return;
    }

    const poll = async () => {
      if (!this.isPolling) return;

      try {
        const currentHeight = await this.getLatestBlockHeight();
        
        if (currentHeight > this.lastBlockHeight) {
          // Check new blocks
          for (let height = this.lastBlockHeight + 1; height <= currentHeight; height++) {
            const txs = await this.getProgramTransactions(height);
            
            for (const tx of txs) {
              const parsed = this.parseTransaction(tx);
              if (parsed && callback) {
                await callback(parsed);
              }
            }
          }
          
          this.lastBlockHeight = currentHeight;
        }
      } catch (error) {
        console.error("Error during polling:", error.message);
      }

      if (this.isPolling) {
        setTimeout(poll, POLL_INTERVAL);
      }
    };

    poll();
  }

  /**
   * Stop polling
   */
  stopPolling() {
    this.isPolling = false;
    console.log("🛑 Stopped Aleo transaction monitoring");
  }

  /**
   * Get program info
   * Uses Aleo API v2: GET /program/:programId
   */
  async getProgramInfo() {
    try {
      const endpoints = [
        `${ALEO_ENDPOINT}/program/${PROGRAM_ID}`,
        `https://api.explorer.provable.com/v2/testnet/program/${PROGRAM_ID}`,
        `https://api.explorer.provable.com/v2/testnet3/program/${PROGRAM_ID}`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { timeout: 10000 });
          if (response.ok) {
            return await response.json();
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error(`HTTP error! status: failed on all endpoints`);
    } catch (error) {
      throw new Error(`Failed to get program info: ${error.message}`);
    }
  }
}

export default new AleoService();

