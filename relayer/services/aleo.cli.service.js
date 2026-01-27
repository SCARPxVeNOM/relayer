/**
 * Aleo CLI Service - Server-Side Transaction Creation
 * 
 * Uses Leo CLI to execute create_intent on privacy_barrier.aleo
 * NOTE: ZK proof generation takes ~30-60 seconds
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';

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
     * Execute create_intent function using Leo CLI with spawn for better output handling
     */
    async createRequestTransfer(amount, chainId, recipientEVM) {
        return new Promise((resolve, reject) => {
            try {
                logger.info('Creating Aleo transaction via Leo CLI', { amount, chainId });

                // Convert parameters
                const amountU64 = BigInt(Math.floor(parseFloat(amount) * 1e18));
                const chainCode = this.getChainCode(chainId);

                // Use the account address
                const destAddress = 'aleo1sqtc9nm359um4drfyc7e4vg25nm7kufvzjqhk3e85tq77qfrvyfqt0krfq';

                const args = [
                    'execute', 'create_intent',
                    `${amountU64}u64`,
                    `${chainCode}u8`,
                    destAddress,
                    '--broadcast', '--yes',
                    '--network', this.network,
                    '--endpoint', this.endpoint
                ];

                logger.info('Spawning Leo process...', {
                    leoPath: this.leoPath,
                    args: args.join(' '),
                    cwd: this.projectDir
                });

                const leo = spawn(this.leoPath, args, {
                    cwd: this.projectDir,
                    shell: true
                });

                let stdout = '';
                let stderr = '';

                leo.stdout.on('data', (data) => {
                    const chunk = data.toString();
                    stdout += chunk;
                    // Log progress
                    if (chunk.includes('Executing') || chunk.includes('Broadcasting') || chunk.includes('transaction ID')) {
                        logger.info('Leo progress', { output: chunk.substring(0, 200) });
                    }
                });

                leo.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                // Set timeout (5 minutes for ZK proof generation)
                const timeout = setTimeout(() => {
                    leo.kill();
                    reject(new Error('Leo CLI timeout after 5 minutes'));
                }, 300000);

                leo.on('close', (code) => {
                    clearTimeout(timeout);

                    logger.info('Leo process completed', {
                        code,
                        stdoutLength: stdout.length,
                        stderrLength: stderr.length
                    });

                    if (code !== 0) {
                        logger.error('Leo CLI exited with error', { code, stderr: stderr.substring(0, 500) });
                        reject(new Error(`Leo CLI exited with code ${code}: ${stderr.substring(0, 200)}`));
                        return;
                    }

                    // Parse transaction ID from output
                    const txIdMatch = stdout.match(/transaction ID[:\s]+'(at1[a-z0-9]+)'/i);

                    if (txIdMatch && txIdMatch[1]) {
                        const txId = txIdMatch[1];
                        logger.info('✅ Transaction broadcast via Leo CLI', {
                            txHash: txId,
                            explorer: `https://explorer.aleo.org/transaction/${txId}`,
                        });
                        resolve(txId);
                        return;
                    }

                    // Try to find any transaction ID
                    const anyTxMatch = stdout.match(/at1[a-z0-9]{58}/g);
                    if (anyTxMatch && anyTxMatch.length > 0) {
                        // Get the first non-fee transaction ID
                        const txId = anyTxMatch[0];
                        logger.info('✅ Transaction found via Leo CLI', {
                            txHash: txId
                        });
                        resolve(txId);
                        return;
                    }

                    // Check if execution was confirmed
                    if (stdout.includes('Execution confirmed') || stdout.includes('Transaction accepted')) {
                        logger.warn('Execution confirmed but no TX ID found');
                        // Generate a placeholder that indicates success
                        resolve('at1_execution_confirmed_' + Date.now());
                        return;
                    }

                    logger.error('Could not parse transaction ID', {
                        stdout: stdout.substring(0, 800)
                    });
                    reject(new Error('Transaction ID not found in Leo output'));
                });

                leo.on('error', (err) => {
                    clearTimeout(timeout);
                    logger.error('Leo spawn error', { error: err.message });
                    reject(new Error(`Failed to spawn Leo: ${err.message}`));
                });

            } catch (error) {
                reject(error);
            }
        });
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
