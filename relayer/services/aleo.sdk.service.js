/**
 * Aleo SDK Service - Using newly deployed privacy_barrier.aleo
 * 
 * Program has: create_intent(amount: u64, chain_id: u8, dest: address) -> bool
 */

import {
    Account,
    AleoNetworkClient,
    NetworkRecordProvider,
    ProgramManager,
    AleoKeyProvider,
    PrivateKey,
    initializeWasm
} from '@provablehq/sdk';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AleoSDKService');

class AleoSDKService {
    constructor() {
        this.privateKey = process.env.ALEO_PRIVATE_KEY;
        this.programId = 'privacy_barrier.aleo'; // Newly deployed!
        this.networkUrl = 'https://api.explorer.provable.com/v1';

        if (!this.privateKey) {
            throw new Error('ALEO_PRIVATE_KEY not configured');
        }

        logger.info('AleoSDKService initialized', {
            programId: this.programId,
            network: this.networkUrl
        });
    }

    /**
     * Create a request transfer transaction on Aleo testnet
     */
    async createRequestTransfer(amount, chainId, recipientEVM) {
        try {
            logger.info('Creating Aleo transaction', { amount, chainId, recipientEVM });

            // Step 1: Create account
            const account = new Account({ privateKey: this.privateKey });
            const privateKeyObject = PrivateKey.from_string(this.privateKey);
            const address = account.address().to_string();

            logger.info('Account created', { address });

            // Step 2: Create providers
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);
            const networkClient = new AleoNetworkClient(this.networkUrl);
            const recordProvider = new NetworkRecordProvider(account, networkClient);

            // Step 3: Create program manager
            const programManager = new ProgramManager(this.networkUrl, keyProvider, recordProvider);
            programManager.setAccount(account);

            // Step 4: Prepare inputs for create_intent function
            // create_intent(amount: u64, chain_id: u8, dest: address) -> bool
            const amountU64 = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const chainCode = this.getChainCode(chainId);

            const inputs = [
                `${amountU64}u64`,  // amount
                `${chainCode}u8`,   // chain_id
                address             // dest (using our address as placeholder)
            ];

            logger.info('Executing create_intent function', {
                program: this.programId,
                function: 'create_intent',
                inputs
            });

            // Step 5: Execute
            const fee = 500000; // 0.5 Aleo credits

            const txId = await programManager.execute(
                this.programId,
                'create_intent',
                fee,
                false, // public fee
                inputs,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                privateKeyObject
            );

            logger.info('Transaction broadcast successful!', {
                txHash: txId,
                explorer: `https://explorer.aleo.org/transaction/${txId}`
            });

            return txId;

        } catch (error) {
            logger.error('Aleo SDK transaction failed', {
                error: error.message,
                stack: error.stack
            });
            throw new Error(`Aleo transaction failed: ${error.message}`);
        }
    }

    getChainCode(chainId) {
        const chainMap = {
            11155111: 1, // Sepolia
            80002: 2,    // Polygon Amoy
        };
        return chainMap[chainId] || 1;
    }
}

export default AleoSDKService;
