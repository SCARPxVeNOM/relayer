/**
 * Aleo Service - Connects to Aleo testnet and monitors program transactions
 */

import fetch from "node-fetch";

const ALEO_ENDPOINT = process.env.ALEO_RPC || "https://api.explorer.provable.com/v1";
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
   */
  async getLatestBlockHeight() {
    try {
      // Try different endpoint formats
      const endpoints = [
        `${ALEO_ENDPOINT}/testnet3/latest/height`,
        `${ALEO_ENDPOINT}/latest/height`,
        `https://api.explorer.provable.com/v1/testnet3/latest/height`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            return parseInt(data);
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
   */
  async getProgramTransactions(blockHeight) {
    try {
      const endpoints = [
        `${ALEO_ENDPOINT}/testnet3/block/${blockHeight}/transactions`,
        `${ALEO_ENDPOINT}/block/${blockHeight}/transactions`,
        `https://api.explorer.provable.com/v1/testnet3/block/${blockHeight}/transactions`,
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
   */
  async getProgramInfo() {
    try {
      const response = await fetch(
        `${ALEO_ENDPOINT}/testnet3/program/${PROGRAM_ID}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get program info: ${error.message}`);
    }
  }
}

export default new AleoService();

