/**
 * Aleo Listener - Monitors Aleo testnet for request_transfer executions
 * Uses Aleo public API to poll blocks and decrypts private inputs with view key
 */

import fetch from "node-fetch";
import { createLogger } from "./utils/logger.js";
import { createAleoRateLimiter } from "./utils/rate-limiter.js";
import CircuitBreaker from "./utils/circuit-breaker.js";
import transactionStorage from "./storage/transaction.db.js";

const logger = createLogger("AleoListener");

/**
 * Aleo API base URL.
 *
 * IMPORTANT: Aleo v2 endpoints use paths like:
 * - GET /block/height/latest
 * - GET /block/:height/transactions
 *
 * Docs:
 * - https://developer.aleo.org/apis/v2/get-latest-height
 * - https://developer.aleo.org/apis/v2/transactions-by-block-height
 *
 * If you previously used a v1 base URL, set ALEO_RPC to a v2 base, e.g.:
 * - https://api.explorer.provable.com/v2/testnet
 */
const ALEO_ENDPOINT = process.env.ALEO_RPC || "https://api.explorer.provable.com/v2/testnet";
const PROGRAM_ID = process.env.ALEO_PROGRAM_ID || "privacy_box_mvp.aleo";
const POLL_INTERVAL = parseInt(process.env.ALEO_POLL_INTERVAL || "10000"); // 10 seconds default

class AleoListener {
  constructor() {
    this.lastBlockHeight = null;
    this.isPolling = false;
    this.viewKey = process.env.ALEO_VIEW_KEY;
    this.processedTransactions = new Set(); // Track processed transaction IDs
    this.callback = null;
    this.rateLimiter = createAleoRateLimiter();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
    });
  }

  /**
   * Get latest block height from Aleo testnet
   */
  async getLatestBlockHeight() {
    return this.circuitBreaker.execute(async () => {
      return this.rateLimiter.perSecond.execute(async () => {
        const baseCandidates = this.getAleoBaseCandidates();
        const endpoints = [];

        // Primary v2 endpoint: GET /block/height/latest
        // https://developer.aleo.org/apis/v2/get-latest-height
        for (const base of baseCandidates) {
          endpoints.push(`${base}/block/height/latest`);
        }

        // Fallback: GET /block/latest then try to derive height
        // https://developer.aleo.org/apis/v2/get-latest-block
        for (const base of baseCandidates) {
          endpoints.push(`${base}/block/latest`);
        }

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              timeout: 10000, // 10 second timeout
            });
            if (response.ok) {
              const data = await response.json();

              // /block/height/latest returns a number
              if (typeof data === "number") return data;
              if (typeof data === "string" && /^\d+$/.test(data)) return parseInt(data, 10);

              // /block/latest returns a block object; try common shapes
              const maybeHeight =
                data?.height ??
                data?.block?.height ??
                data?.header?.metadata?.height ??
                data?.block?.header?.metadata?.height ??
                data?.metadata?.height ??
                null;

              if (typeof maybeHeight === "number") return maybeHeight;
              if (typeof maybeHeight === "string" && /^\d+$/.test(maybeHeight)) return parseInt(maybeHeight, 10);
            }
          } catch (e) {
            continue;
          }
        }

        throw new Error("All endpoint attempts failed");
      });
    });
  }

  /**
   * Returns a list of Aleo API base URLs to try (v2).
   * If ALEO_RPC is set to a v1 URL, we also try a best-effort v2 upgrade.
   */
  getAleoBaseCandidates() {
    const bases = new Set();

    const envBase = process.env.ALEO_RPC;
    if (envBase) {
      bases.add(envBase.replace(/\/+$/, ""));

      // Best-effort upgrade: if env is v1, also try v2
      // Example: https://api.explorer.aleo.org/v1  -> https://api.explorer.provable.com/v2/testnet
      if (envBase.includes("/v1")) {
        bases.add(envBase.replace("/v1", "/v2"));
        bases.add("https://api.explorer.provable.com/v2/testnet");
        bases.add("https://api.explorer.provable.com/v2/testnet3");
      }
    }

    // Known public bases (v2)
    bases.add("https://api.explorer.provable.com/v2/testnet");
    bases.add("https://api.explorer.provable.com/v2/testnet3");
    bases.add("https://api.explorer.provable.com/v2/canary");
    bases.add("https://api.explorer.provable.com/v2/mainnet");

    return Array.from(bases);
  }

  /**
   * Get block transactions
   */
  async getBlockTransactions(blockHeight) {
    try {
      // First, try to get real transactions from Aleo API
      // GET /block/:height/transitions
      // https://developer.aleo.org/apis/v2/transactions-by-block-height
      const endpoints = this.getAleoBaseCandidates().map(
        (base) => `${base}/block/${blockHeight}/transactions`,
      );

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            const txs = data.transactions || data || [];

            if (txs.length > 0) {
              return txs;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Fallback: Check for simulated transactions (MVP mode)
      const AleoTransactionService = (await import('./services/aleo.transaction.service.js')).default;
      const simulatedTxs = AleoTransactionService.getPendingTransactions() || [];

      if (simulatedTxs.length > 0) {
        logger.debug(`Using ${simulatedTxs.length} simulated transactions from local queue`);
        return simulatedTxs;
      }

      return [];
    } catch (error) {
      logger.warn(`Failed to get transactions for block ${blockHeight}: ${error.message}`);
      return [];
    }
  }

  /**
   * Decrypt private inputs using view key
   * 
   * Note: Full decryption requires Aleo SDK (@provablehq/sdk or @aleo/sdk)
   * This implementation attempts to extract data from available transaction fields
   * 
   * To use full SDK decryption, install: npm install @provablehq/sdk
   * Then use: AleoNetworkClient with PrivateKey.from_string(viewKey)
   */
  async decryptPrivateInputs(transition, viewKey) {
    if (!viewKey) {
      logger.warn("No view key provided, cannot decrypt private inputs");
      return null;
    }

    try {
      // In Aleo, private inputs are encrypted in transition outputs
      // The outputs contain encrypted records that need to be decrypted with the view key
      const outputs = transition.outputs || [];
      const inputs = transition.inputs || [];

      // Try to extract from outputs (encrypted records)
      // Format: { type: 'record', ... } or ciphertext strings
      let amount = null;
      let chainId = null;
      let recipient = null;

      // Parse outputs for encrypted data
      for (const output of outputs) {
        if (typeof output === 'string') {
          // Try to parse Aleo value format from string
          // Example: "10u64", "1u8", "aleo1xxx..."
          const u64Match = output.match(/(\d+)u64/);
          const u8Match = output.match(/(\d+)u8/);
          const addressMatch = output.match(/aleo1[a-z0-9]+/);

          if (u64Match && !amount) {
            amount = u64Match[1];
          }
          if (u8Match && !chainId) {
            chainId = parseInt(u8Match[1]);
          }
          if (addressMatch && !recipient) {
            recipient = addressMatch[0];
          }
        } else if (output && typeof output === 'object') {
          // Try to extract from object structure
          if (output.value && !amount) {
            amount = output.value;
          }
          if (output.chain_id !== undefined && !chainId) {
            chainId = output.chain_id;
          }
          if (output.dest && !recipient) {
            recipient = output.dest;
          }
        }
      }

      // If we have all values, return them
      if (amount && chainId !== null && recipient) {
        return { amount, chain_id: chainId, dest: recipient };
      }

      // TODO: Implement full SDK decryption
      // Example with SDK:
      // const { PrivateKey } = require('@provablehq/sdk');
      // const viewKeyObj = PrivateKey.from_string(viewKey);
      // const decrypted = await viewKeyObj.decrypt(output.ciphertext);

      return null;
    } catch (error) {
      logger.error(`Failed to decrypt private inputs: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract transfer intent from transaction
   * Filters for request_transfer executions and extracts private data
   */
  async extractTransferIntent(tx) {
    try {
      // Check if transaction is an execution
      if (tx.type !== "execute" && tx.type !== "execution") {
        return null;
      }

      const execution = tx.execution || tx;
      const transitions = execution.transitions || [];

      // Find request_transfer transition
      const transferTransition = transitions.find(
        t => t.program === PROGRAM_ID && t.function === "request_transfer"
      );

      if (!transferTransition) {
        return null;
      }

      // Extract transaction ID as requestId
      const requestId = tx.id || tx.transaction_id || `${tx.blockHeight}-${tx.index || 0}`;

      // Try to decrypt private inputs
      let amount, chainId, recipient = null;

      if (this.viewKey) {
        const decrypted = await this.decryptPrivateInputs(transferTransition, this.viewKey);
        if (decrypted) {
          amount = decrypted.amount;
          chainId = decrypted.chain_id;
          recipient = decrypted.dest;
        }
      }

      // If decryption failed or no view key, try to extract from public outputs
      // Some Aleo programs expose partial data in public outputs
      const inputs = transferTransition.inputs || [];
      const outputs = transferTransition.outputs || [];

      // Parse inputs/outputs for amount, chain_id, dest
      // This is a fallback - ideally we decrypt with view key
      for (const input of inputs) {
        if (typeof input === 'string') {
          // Try to parse Aleo value format
          if (input.includes('u64') || input.includes('u32')) {
            const match = input.match(/(\d+)u\d+/);
            if (match && !amount) {
              amount = match[1];
            }
          }
          if (input.includes('u8')) {
            const match = input.match(/(\d+)u8/);
            if (match && !chainId) {
              chainId = parseInt(match[1]);
            }
          }
          // Check for EVM address format (0x...) - this is how we store it in simulation
          if (input.startsWith('0x') && input.length === 42 && !recipient) {
            recipient = input;
          }
          // Also check for Aleo address format (aleo1...)
          else if (input.startsWith('aleo1') && !recipient) {
            // This might be the recipient in Aleo format
            // For now, we need the EVM address from conversion
          }
        }
      }

      // If we still don't have the data, try fetching full transaction details
      if (!amount || !chainId || !recipient) {
        const fullTx = await this.getTransactionDetails(tx.id || requestId);
        if (fullTx) {
          // Try to extract from full transaction structure
          const fullExecution = fullTx.execution || fullTx;
          const fullTransitions = fullExecution.transitions || [];
          const fullTransferTransition = fullTransitions.find(
            t => t.program === PROGRAM_ID && t.function === "request_transfer"
          );

          if (fullTransferTransition) {
            // Try parsing inputs/outputs from full transaction
            const fullInputs = fullTransferTransition.inputs || [];
            const fullOutputs = fullTransferTransition.outputs || [];

            // Parse all inputs and outputs more thoroughly
            [...fullInputs, ...fullOutputs].forEach(item => {
              if (typeof item === 'string') {
                const u64Match = item.match(/(\d+)u64/);
                const u8Match = item.match(/(\d+)u8/);
                const addressMatch = item.match(/(aleo1[a-z0-9]+|0x[a-fA-F0-9]{40})/);

                if (u64Match && !amount) amount = u64Match[1];
                if (u8Match && !chainId) chainId = parseInt(u8Match[1]);
                if (addressMatch && !recipient) recipient = addressMatch[1];
              }
            });
          }
        }
      }

      // Validate we have all required fields
      if (!amount || chainId === null || chainId === undefined || !recipient) {
        logger.warn(`Incomplete transfer intent for ${requestId}`, {
          hasAmount: !!amount,
          hasChainId: chainId !== null && chainId !== undefined,
          hasRecipient: !!recipient,
          transition: transferTransition,
        });
        return null;
      }

      // Convert chain code back to EVM chain ID
      // Chain codes: 1=Sepolia, 2=Amoy (from getChainCode() in aleo.transaction.service.js)
      const chainIdMap = {
        1: 11155111,  // Sepolia
        2: 80002,     // Polygon Amoy
        10: 1,        // Ethereum Mainnet
        11: 137,      // Polygon Mainnet
      };

      const evmChainId = chainIdMap[chainId] || chainId;

      // Normalize recipient address (convert from Aleo format if needed)
      // For MVP, assume recipient is already in EVM format (0x...)
      const normalizedRecipient = recipient.startsWith('0x')
        ? recipient
        : await this.convertAleoToEVMAddress(recipient);

      // Normalize amount (convert from Aleo units to ETH/MATIC units)
      const normalizedAmount = this.normalizeAmount(amount);

      return {
        requestId,
        chainId: parseInt(chainId),
        amount: normalizedAmount,
        recipient: normalizedRecipient,
      };
    } catch (error) {
      logger.error(`Failed to extract transfer intent: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Get full transaction details
   */
  async getTransactionDetails(txId) {
    try {
      // Keep as best-effort; different explorers may shape this differently.
      const endpoints = this.getAleoBaseCandidates().map((base) => `${base}/transaction/${txId}`);

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            return await response.json();
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    } catch (error) {
      logger.warn(`Failed to get transaction details for ${txId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert Aleo address to EVM address (placeholder - actual conversion needed)
   */
  async convertAleoToEVMAddress(aleoAddress) {
    // In production, this would require mapping or conversion logic
    // For MVP, if the address is already EVM format, return as-is
    if (aleoAddress.startsWith('0x')) {
      return aleoAddress;
    }
    // Otherwise, we'd need a mapping or conversion service
    // For now, return as-is and let validation catch invalid addresses
    return aleoAddress;
  }

  /**
   * Normalize amount from Aleo units to human-readable format
   */
  normalizeAmount(amount) {
    // Convert from Aleo u64 units to ETH/MATIC units (divide by 10^18)
    // For MVP, assume amount is already in wei/gwei format or needs conversion
    const numAmount = typeof amount === 'string' ? parseInt(amount) : parseInt(amount);

    // If amount is very large (> 10^15), assume it's in wei and convert
    if (numAmount > 1000000000000000) {
      return (numAmount / 1e18).toString();
    }

    // Otherwise, assume it's already in human-readable format
    return numAmount.toString();
  }

  /**
   * Process a single transaction
   */
  async processTransaction(tx) {
    const txId = tx.id || tx.transaction_id || `${tx.blockHeight}-${tx.index || 0}`;

    // Check persistent storage first
    if (transactionStorage.initialized && transactionStorage.isProcessed(txId)) {
      return;
    }

    // Also check in-memory cache
    if (this.processedTransactions.has(txId)) {
      return;
    }

    const intent = await this.extractTransferIntent(tx);

    if (intent) {
      // Mark as processed in both storage and memory
      this.processedTransactions.add(txId);

      if (transactionStorage.initialized) {
        transactionStorage.markProcessed({
          txId,
          requestId: intent.requestId,
          chainId: intent.chainId,
          amount: intent.amount,
          recipient: intent.recipient,
          status: 'pending',
          aleoTxId: txId,
        });
      }

      logger.info("📦 Extracted transfer intent", intent);

      // Clean up simulated transaction from global queue
      const AleoTransactionService = (await import('./services/aleo.transaction.service.js')).default;
      AleoTransactionService.clearProcessedTransaction(txId);

      if (this.callback) {
        await this.callback(intent);
      }
    }
  }

  /**
   * Start polling for new transactions
   */
  async startPolling(callback) {
    if (this.isPolling) {
      logger.warn("Aleo polling already started");
      return;
    }

    this.callback = callback;
    this.isPolling = true;

    logger.info(`🔍 Starting Aleo transaction monitoring for ${PROGRAM_ID}...`);

    if (!this.viewKey) {
      logger.warn("⚠️  No ALEO_VIEW_KEY provided - private input decryption may fail");
    }

    try {
      this.lastBlockHeight = await this.getLatestBlockHeight();
      logger.info(`📊 Starting from block height: ${this.lastBlockHeight}`);
    } catch (error) {
      logger.error(`Failed to get initial block height: ${error.message}`);
      this.isPolling = false;
      return;
    }

    const poll = async () => {
      if (!this.isPolling) return;

      try {
        const currentHeight = await this.getLatestBlockHeight();

        if (currentHeight > this.lastBlockHeight) {
          logger.debug(`Processing blocks ${this.lastBlockHeight + 1} to ${currentHeight}`);

          // Process new blocks
          for (let height = this.lastBlockHeight + 1; height <= currentHeight; height++) {
            const txs = await this.getBlockTransactions(height);

            for (const tx of txs) {
              await this.processTransaction(tx);
            }
          }

          this.lastBlockHeight = currentHeight;
        }
      } catch (error) {
        logger.error(`Error during polling: ${error.message}`);
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
    logger.info("🛑 Stopped Aleo transaction monitoring");
  }
}

export default new AleoListener();

