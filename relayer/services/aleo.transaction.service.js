/**
 * Aleo Transaction Service - Updated with Leo CLI Support
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('AleoTransactionService');
const USE_REAL_NETWORK = process.env.ALEO_USE_REAL_NETWORK === 'true';

class AleoTransactionService {
    /**
     * Create a request_transfer transaction
     */
    async createRequestTransfer(amount, chainId, recipientEVM) {
        try {
            // Check if we should use real network via Leo CLI
            if (USE_REAL_NETWORK) {
                logger.info('Using REAL Aleo network mode via Leo CLI');
                const AleoCliService = (await import('./aleo.cli.service.js')).default;
                const cliService = new AleoCliService();
                return await cliService.createRequestTransfer(amount, chainId, recipientEVM);
            }

            // Otherwise use simulation mode
            logger.info('Using SIMULATION mode (set ALEO_USE_REAL_NETWORK=true for real network)');
            logger.info('Creating request_transfer transaction', {
                amount,
                chainId,
                recipient: recipientEVM,
            });

            // Validate inputs
            if (!amount || !chainId || !recipientEVM) {
                throw new Error('Missing required parameters');
            }

            // Simulate transaction creation
            const amountU64 = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const chainCode = this.getChainCode(chainId);

            // Generate deterministic transaction ID
            const crypto = await import('crypto');
            const dataToHash = `${amountU64}-${chainCode}-${recipientEVM}-${Date.now()}`;
            const txHash = 'at1' + crypto
                .createHash('sha256')
                .update(dataToHash)
                .digest('hex')
                .substring(0, 58);

            logger.info('Simulated Aleo transaction created', {
                txHash,
                amount: amountU64.toString(),
                chainCode,
            });

            // Store in global queue for listener
            if (!global.pendingAleoTransactions) {
                global.pendingAleoTransactions = [];
            }

            global.pendingAleoTransactions.push({
                txHash,
                amount: amountU64.toString(),
                chainCode,
                dest: recipientEVM,
                timestamp: Date.now(),
            });

            return txHash;
        } catch (error) {
            logger.error('Failed to create transaction', error);
            throw new Error(`Aleo transaction creation failed: ${error.message}`);
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

    /**
     * Get pending transactions (for simulation mode)
     */
    static getPendingTransactions() {
        return global.pendingAleoTransactions || [];
    }
}

export default AleoTransactionService;
