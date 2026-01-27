/**
 * Simple Integration Test
 * Tests the complete Aleo → Relayer → EVM flow
 */

import dotenv from 'dotenv';
dotenv.config();

const logger = {
    info: (...args) => console.log('[TEST]', ...args),
    error: (...args) => console.error('[❌]', ...args),
    success: (...args) => console.log('[✓]', ...args),
};

async function runTests() {
    logger.info('🚀 Testing Privacy Bridge Integration\n');

    try {
        // Dynamically import modules
        const { default: AleoTransactionService } = await import('./relayer/services/aleo.transaction.service.js');
        const { evmToAleo, validateAddress } = await import('./relayer/utils/address-converter.js');

        // Test 1: Address Validation
        logger.info('Test 1: Address Validation');
        const testAddress = '0x604e6609a39861162FFAeA37E5fadDd6E91630Bb';
        const isValid = validateAddress(testAddress, 'evm');
        if (isValid) {
            logger.success(`Address valid: ${testAddress}`);
        } else {
            throw new Error('Address validation failed');
        }

        // Test 2: Transaction Creation
        logger.info('\nTest 2: Creating Aleo Transaction');
        const aleoService = new AleoTransactionService();
        const txHash = await aleoService.createRequestTransfer('0.001', 11155111, testAddress);
        logger.success(`Transaction Hash: ${txHash}`);

        if (!txHash.startsWith('at1')) {
            throw new Error('Invalid transaction hash format');
        }

        // Test 3: Check Queue
        logger.info('\nTest 3: Checking Transaction Queue');
        const pending = AleoTransactionService.getPendingTransactions();
        logger.success(`Pending Transactions: ${pending.length}`);

        if (pending.length === 0) {
            throw new Error('Transaction not added to queue');
        }

        logger.info('\n' + '='.repeat(50));
        logger.success('ALL TESTS PASSED! ✓');
        logger.info('='.repeat(50) + '\n');

        logger.info('Next: Start the relayer to process transactions');
        logger.info('Command: npm start\n');

    } catch (error) {
        logger.error('\nTest Failed:', error.message);
        logger.error(error.stack);
        process.exit(1);
    }
}

runTests();
