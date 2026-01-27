/**
 * Aleo Transaction Service - Create and broadcast Aleo transactions
 * 
 * This service handles:
 * - Initializing Aleo account from private key
 * - Creating request_transfer transactions
 * - Broadcasting to Aleo network
 * - Returning transaction hashes for tracking
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';
import { evmToAleo } from '../utils/address-converter.js';

const logger = createLogger('AleoTransactionService');

// Aleo network configuration
const ALEO_RPC = process.env.ALEO_RPC || 'https://api.explorer.provable.com/v2/testnet';
const PROGRAM_ID = process.env.ALEO_PROGRAM_ID || 'privacy_box_mvp.aleo';

/**
 * Aleo Transaction Service
 * 
 * Note: The Aleo SDK (@provablehq/sdk) is complex and may require WASM compilation.
 * For MVP, we'll use a simplified approach:
 * 1. Generate transaction offline (or use leo cli)
 * 2. Submit via API
 * 3. Track via transaction hash
 * 
 * In production, integrate full SDK:
 * import { Account, Program, AleoNetworkClient } from '@provablehq/sdk';
 */
class AleoTransactionService {
    constructor() {
        this.privateKey = process.env.ALEO_PRIVATE_KEY;
        this.rpcUrl = ALEO_RPC;
        this.programId = PROGRAM_ID;

        if (!this.privateKey) {
            logger.warn('ALEO_PRIVATE_KEY not configured - transaction creation will fail');
        }
    }

    /**
     * Create a request_transfer transaction
     * 
     * @param {string} amount - Amount to transfer (in ETH/MATIC units)
     * @param {number} chainId - Target chain ID (11155111 for Sepolia, 80002 for Amoy)
     * @param {string} recipientEVM - Recipient EVM address (0x...)
     * @returns {Promise<string>} Transaction hash
     */
    async createRequestTransfer(amount, chainId, recipientEVM) {
        try {
            logger.info('Creating request_transfer transaction', {
                amount,
                chainId,
                recipient: recipientEVM,
            });

            // Validate inputs
            if (!amount || !chainId || !recipientEVM) {
                throw new Error('Missing required parameters: amount, chainId, recipientEVM');
            }

            // Convert EVM address to Aleo format
            const recipientAleo = evmToAleo(recipientEVM);

            // Map chain IDs to chain codes (u8)
            const chainCode = this.getChainCode(chainId);

            // Convert amount to Aleo units (u64)
            // Amount is in ETH/MATIC (e.g., "0.001")
            // Convert to smallest unit (wei) then to u64
            const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const amountU64 = amountWei.toString();

            // For MVP: Generate a transaction ID and store the intent
            // In production, this would call the Aleo SDK to create and broadcast the transaction
            // Example with SDK:
            // const account = Account.from_private_key(this.privateKey);
            // const program = await Program.fromString(programSource);
            // const tx = await program.execute('request_transfer', [vault, amountU64, chainCode, recipientAleo]);
            // const txHash = await networkClient.submitTransaction(tx);

            // Generate transaction hash (prefixed with 'at1' for Aleo Transaction)
            const timestamp = Date.now();
            const txHash = `at1${this.generateTxHash(amount, chainId, recipientEVM, timestamp)}`;

            logger.info('Request transfer transaction created', {
                txHash,
                amount: amountU64,
                chainCode,
                recipient: recipientAleo,
            });

            // Store transaction intent in memory for the listener to pick up
            // This simulates the Aleo network broadcasting the transaction
            this.simulateAleoTransaction({
                txHash,
                amount: amountU64,
                chainId,
                recipient: recipientEVM, // Store EVM format for relayer
                timestamp,
            });

            return txHash;
        } catch (error) {
            logger.error('Failed to create request_transfer transaction', error);
            throw new Error(`Aleo transaction creation failed: ${error.message}`);
        }
    }

    /**
     * Map EVM chain ID to Aleo chain code (u8)
     */
    getChainCode(chainId) {
        const chainMap = {
            11155111: 1, // Sepolia
            80002: 2,    // Polygon Amoy
            1: 10,       // Ethereum Mainnet
            137: 11,     // Polygon Mainnet
        };

        const code = chainMap[chainId];
        if (!code) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        return code;
    }

    /**
     * Generate a deterministic transaction hash
     */
    generateTxHash(amount, chainId, recipient, timestamp) {
        const data = `${amount}-${chainId}-${recipient}-${timestamp}`;
        const hash = crypto
            .createHash('sha256')
            .update(data)
            .digest('hex')
            .substring(0, 56); // Aleo tx hashes are typically 64 chars (at1 prefix + 58 chars)

        return hash;
    }

    /**
     * Simulate Aleo transaction for MVP
     * 
     * In production, this would be replaced by actual Aleo network integration.
     * For now, we'll emit the transaction to be picked up by the local listener.
     */
    simulateAleoTransaction(txData) {
        // Store globally for listener to pick up
        if (!global.pendingAleoTransactions) {
            global.pendingAleoTransactions = [];
        }

        global.pendingAleoTransactions.push({
            id: txData.txHash,
            type: 'execute',
            execution: {
                transitions: [{
                    program: this.programId,
                    function: 'request_transfer',
                    inputs: [
                        `${txData.amount}u64`,
                        `${this.getChainCode(txData.chainId)}u8`,
                        txData.recipient, // EVM address
                    ],
                }],
            },
            timestamp: txData.timestamp,
            blockHeight: Math.floor(Date.now() / 10000), // Simulated block height
        });

        logger.debug('Simulated Aleo transaction added to pending queue', {
            txHash: txData.txHash,
            queueSize: global.pendingAleoTransactions.length,
        });
    }

    /**
     * Get pending transactions (for simulation)
     */
    static getPendingTransactions() {
        if (!global.pendingAleoTransactions) {
            return [];
        }
        return global.pendingAleoTransactions;
    }

    /**
     * Clear processed transaction (for simulation)
     */
    static clearProcessedTransaction(txHash) {
        if (!global.pendingAleoTransactions) {
            return;
        }
        global.pendingAleoTransactions = global.pendingAleoTransactions.filter(
            tx => tx.id !== txHash
        );
    }
}

export default AleoTransactionService;
