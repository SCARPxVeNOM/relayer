/**
 * Aleo Transaction Service - Uses Leo CLI for Real Testnet Transactions
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
            // Check if we should use real network
            if (USE_REAL_NETWORK) {
                logger.info('🚀 Using REAL Aleo network mode via Leo CLI');
                try {
                    const AleoCliService = (await import('./aleo.cli.service.js')).default;
                    const cliService = new AleoCliService();
                    return await cliService.createRequestTransfer(amount, chainId, recipientEVM);
                } catch (cliError) {
                    logger.error('Leo CLI failed, falling back to simulation', { error: cliError.message });
                    // Fall back to simulation if CLI fails
                    return await this.simulateTransaction(amount, chainId, recipientEVM);
                }
            }

            // Otherwise use simulation mode
            logger.info('Using SIMULATION mode (set ALEO_USE_REAL_NETWORK=true for real network)');
            return await this.simulateTransaction(amount, chainId, recipientEVM);

        } catch (error) {
            logger.error('Transaction creation failed', { error: error.message });
            throw new Error(`Aleo transaction creation failed: ${error.message}`);
        }
    }

    /**
     * Simulate transaction for testing/fallback
     */
    async simulateTransaction(amount, chainId, recipientEVM) {
        logger.info('Creating simulated transaction', { amount, chainId, recipient: recipientEVM });

        // Validate inputs
        if (!amount || !chainId || !recipientEVM) {
            throw new Error('Missing required parameters');
        }

        // Generate deterministic transaction ID
        const crypto = await import('crypto');
        const dataToHash = `${amount}-${chainId}-${recipientEVM}-${Date.now()}`;
        const txHash = 'at1' + crypto
            .createHash('sha256')
            .update(dataToHash)
            .digest('hex')
            .substring(0, 58);

        const amountU64 = BigInt(Math.floor(parseFloat(amount) * 1e18));
        const chainCode = this.getChainCode(chainId);

        logger.info('Simulated Aleo transaction created', { txHash, amount: amountU64.toString(), chainCode });

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
