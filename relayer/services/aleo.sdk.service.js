/**
 * Aleo SDK Service - Real Testnet Transaction Creation with Full SDK Integration
 * 
 * This service uses @provablehq/sdk to broadcast real transactions to Aleo testnet
 */

import { Account, ProgramManager, AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider } from '@provablehq/sdk';
import { createLogger } from '../utils/logger.js';
import { evmToAleo } from '../utils/address-converter.js';

const logger = createLogger('AleoSDKService');

class AleoSDKService {
    constructor() {
        this.privateKey = process.env.ALEO_PRIVATE_KEY;
        this.programId = process.env.ALEO_PROGRAM_ID || 'privacy_box_mvp.aleo';
        this.networkUrl = process.env.ALEO_RPC || 'https://api.explorer.provable.com/v2/testnet';

        if (!this.privateKey) {
            throw new Error('ALEO_PRIVATE_KEY not configured - cannot create real transactions');
        }

        try {
            // Initialize Aleo account from private key
            this.account = Account.from_string(this.privateKey);
            const address = this.account.to_address().to_string();

            logger.info('Aleo account initialized', {
                address,
                network: this.networkUrl,
            });

            // Initialize network client
            this.networkClient = new AleoNetworkClient(this.networkUrl);

            // Initialize key provider for proving keys
            this.keyProvider = new AleoKeyProvider();
            this.keyProvider.useCache(true);

            // Initialize record provider for accessing on-chain records
            this.recordProvider = new NetworkRecordProvider(this.account, this.networkClient);

            // Initialize program manager for executing programs
            this.programManager = new ProgramManager(
                this.networkUrl,
                this.keyProvider,
                this.recordProvider
            );

            this.programManager.setAccount(this.account);

            logger.info('Aleo SDK initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Aleo SDK', error);
            throw new Error(`SDK initialization failed: ${error.message}`);
        }
    }

    /**
     * Create and broadcast a real request_transfer transaction to Aleo testnet
     */
    async createRequestTransfer(amount, chainId, recipientEVM) {
        try {
            logger.info('Creating real Aleo transaction with SDK', {
                amount,
                chainId,
                recipient: recipientEVM,
            });

            // Convert parameters to Aleo format
            const amountU64 = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const chainCode = this.getChainCode(chainId);
            const recipientAleo = evmToAleo(recipientEVM);

            logger.info('Transaction parameters prepared', {
                amountU64: amountU64.toString(),
                chainCode,
                recipientAleo,
                program: this.programId,
            });

            // Prepare inputs for request_transfer function
            // Function signature: request_transfer(amount: u64, chain_id: u8, dest: address) -> bool
            const inputs = [
                `${amountU64}u64`,
                `${chainCode}u8`,
                recipientAleo,
            ];

            logger.info('Executing program on Aleo testnet', {
                program: this.programId,
                function: 'request_transfer',
                inputs,
                fee: '0.1 Aleo',
            });

            // Execute the program and broadcast to network
            // Fee: 0.1 Aleo credits (100000 microcredits)
            const fee = 100000;
            const privateFee = false; // Use public fee payment

            const txId = await this.programManager.execute(
                this.programId,
                'request_transfer',
                fee,
                privateFee,
                inputs
            );

            logger.info('✅ Real Aleo transaction broadcast successfully!', {
                txHash: txId,
                explorer: `https://explorer.aleo.org/transaction/${txId}`,
                amount: amountU64.toString(),
                chainCode,
            });

            return txId;
        } catch (error) {
            logger.error('Failed to create real Aleo transaction', {
                error: error.message,
                stack: error.stack,
            });

            // Provide helpful error messages
            if (error.message.includes('insufficient')) {
                throw new Error('Insufficient Aleo credits. Fund your wallet at https://faucet.aleo.org/');
            }

            if (error.message.includes('program not found')) {
                throw new Error(`Program ${this.programId} not found on testnet. Ensure it's deployed.`);
            }

            throw new Error(`Real Aleo transaction failed: ${error.message}`);
        }
    }

    /**
     * Get account balance
     */
    async getBalance() {
        try {
            const address = this.account.to_address().to_string();
            const balance = await this.networkClient.getBalance(address);
            logger.info('Account balance', { address, balance });
            return balance;
        } catch (error) {
            logger.error('Failed to get balance', error);
            return null;
        }
    }

    /**
     * Get program information
     */
    async getProgramInfo() {
        try {
            const program = await this.networkClient.getProgram(this.programId);
            logger.info('Program info retrieved', { programId: this.programId });
            return program;
        } catch (error) {
            logger.error('Failed to get program info', error);
            return null;
        }
    }

    /**
     * Map EVM chain ID to Aleo chain code
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
}

export default AleoSDKService;
