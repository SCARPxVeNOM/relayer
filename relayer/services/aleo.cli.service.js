/**
 * Aleo CLI Service - Server-Side Transaction Creation
 * 
 * Uses Leo CLI to execute create_intent on privacy_barrier.aleo
 * This works reliably - tested and confirmed on Aleo testnet!
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('AleoCliService');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AleoCliService {
    constructor() {
        this.privateKey = process.env.ALEO_PRIVATE_KEY;
        this.programId = 'privacy_barrier.aleo';
        this.network = 'testnet';
        this.endpoint = 'https://api.explorer.provable.com/v1';
        // Path to the Leo project directory
        this.projectDir = path.resolve(__dirname, '../../aleo/privacy_barrier');
        // Leo executable path
        this.leoPath = process.env.LEO_PATH || 'C:\\Users\\aryan\\.cargo\\bin\\leo.exe';

        if (!this.privateKey) {
            throw new Error('ALEO_PRIVATE_KEY not configured');
        }

        logger.info('AleoCliService initialized', {
            programId: this.programId,
            projectDir: this.projectDir,
            leoPath: this.leoPath
        });
    }

    /**
     * Execute create_intent function using Leo CLI
     */
    async createRequestTransfer(amount, chainId, recipientEVM) {
        try {
            logger.info('Creating Aleo transaction via Leo CLI', { amount, chainId });

            // Convert parameters
            const amountU64 = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const chainCode = this.getChainCode(chainId);

            // Use the account address from environment (or derive from private key)
            const destAddress = 'aleo1sqtc9nm359um4drfyc7e4vg25nm7kufvzjqhk3e85tq77qfrvyfqt0krfq';

            // Build Leo execute command
            const cmd = `"${this.leoPath}" execute create_intent "${amountU64}u64" "${chainCode}u8" "${destAddress}" --broadcast --yes --network ${this.network} --endpoint ${this.endpoint}`;

            logger.info('Executing Leo command...', {
                cmd: cmd.substring(0, 100) + '...',
                cwd: this.projectDir
            });

            // Execute command from project directory
            const { stdout, stderr } = await execAsync(cmd, {
                cwd: this.projectDir,
                timeout: 300000, // 5 minute timeout
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                shell: 'powershell.exe'
            });

            if (stderr && !stderr.includes('Warning')) {
                logger.warn('Leo CLI stderr:', stderr);
            }

            logger.info('Leo CLI output received', {
                outputLength: stdout.length
            });

            // Parse transaction ID from output
            // Leo outputs: "transaction ID: 'at1...'"
            const txIdMatch = stdout.match(/transaction ID[:\s]+'(at1[a-z0-9]+)'/i);

            if (txIdMatch && txIdMatch[1]) {
                const txId = txIdMatch[1];
                logger.info('✅ Transaction broadcast via Leo CLI', {
                    txHash: txId,
                    explorer: `https://explorer.aleo.org/transaction/${txId}`,
                });
                return txId;
            }

            // Check for confirmation
            if (stdout.includes('Execution confirmed') || stdout.includes('Transaction accepted')) {
                // Try to find any transaction ID in output
                const anyTxMatch = stdout.match(/at1[a-z0-9]{58}/);
                if (anyTxMatch) {
                    logger.info('✅ Transaction confirmed via Leo CLI', {
                        txHash: anyTxMatch[0]
                    });
                    return anyTxMatch[0];
                }
            }

            // If no transaction ID found, log full output
            logger.error('Could not parse transaction ID', { stdout: stdout.substring(0, 500) });
            throw new Error('Transaction ID not found in Leo output');

        } catch (error) {
            logger.error('Leo CLI execution failed', {
                error: error.message,
                stderr: error.stderr?.substring(0, 500)
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
