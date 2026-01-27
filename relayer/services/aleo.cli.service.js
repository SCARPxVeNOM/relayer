/**
 * Aleo CLI Service - Server-Side Transaction Creation
 * 
 * Uses Leo CLI to create and broadcast transactions server-side.
 * This works in Node.js unlike the SDK's execute() method.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('AleoCliService');

class AleoCliService {
    constructor() {
        this.privateKey = process.env.ALEO_PRIVATE_KEY;
        this.programId = process.env.ALEO_PROGRAM_ID || 'privacy_box_mvp.aleo';
        this.network = 'testnet';
        this.endpoint = process.env.ALEO_RPC || 'https://api.explorer.provable.com/v1';

        if (!this.privateKey) {
            throw new Error('ALEO_PRIVATE_KEY not configured');
        }
    }

    /**
     * Execute program using Leo CLI
     */
    async createRequestTransfer(amount, chainId, recipientEVM) {
        try {
            logger.info('Creating Aleo transaction via Leo CLI', {
                amount,
                chainId,
            });

            // Convert parameters
            const amountU64 = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const chainCode = this.getChainCode(chainId);

            // Build Leo execute command
            // leo execute creates and broadcasts the transaction
            const cmd = `leo execute create_intent \\
        "${amountU64}u64" \\
        "${chainCode}u8" \\
        "${recipientEVM}" \\
        --private-key "${this.privateKey}" \\
        --network ${this.network} \\
        --endpoint ${this.endpoint} \\
        --broadcast`;

            logger.info('Executing Leo command...');

            // Execute command
            const { stdout, stderr } = await execAsync(cmd, {
                timeout: 120000, // 2 minute timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            if (stderr && !stderr.includes('Warning')) {
                logger.error('Leo CLI stderr:', stderr);
            }

            // Parse transaction ID from output
            // Leo outputs something like "Transaction ID: at1..."
            const txIdMatch = stdout.match(/Transaction.*?ID[:\s]+(at1[a-z0-9]+)/i);

            if (txIdMatch && txIdMatch[1]) {
                const txId = txIdMatch[1];
                logger.info('✅ Transaction broadcast via Leo CLI', {
                    txHash: txId,
                    explorer: `https://explorer.aleo.org/transaction/${txId}`,
                });
                return txId;
            }

            // If no transaction ID found, throw error
            logger.error('Could not parse transaction ID from Leo output');
            throw new Error('Transaction ID not found in Leo output');

        } catch (error) {
            logger.error('Leo CLI execution failed', {
                error: error.message,
                stderr: error.stderr,
            });

            throw new Error(`Aleo transaction via Leo CLI failed: ${error.message}`);
        }
    }

    /**
     * Map EVM chain ID to Aleo chain code
     */
    getChainCode(chainId) {
        const chainMap = {
            11155111: 1, // Sepolia
            80002: 2,    // Polygon Amoy
        };

        return chainMap[chainId] || 1;
    }
}

export default AleoCliService;
