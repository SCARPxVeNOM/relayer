/**
 * Test Real Network Mode Toggle
 * 
 * This script tests switching between simulation and real network modes
 */

import dotenv from 'dotenv';
dotenv.config();

const logger = {
    info: (...args) => console.log('[TEST]', ...args),
    error: (...args) => console.error('[❌]', ...args),
    success: (...args) => console.log('[✅]', ...args),
};

async function testNetworkModes() {
    logger.info('🧪 Testing Network Mode Configuration\n');

    // Check current mode
    const useRealNetwork = process.env.ALEO_USE_REAL_NETWORK === 'true';

    logger.info('Current Configuration:');
    logger.info(`  ALEO_USE_REAL_NETWORK = ${process.env.ALEO_USE_REAL_NETWORK || 'not set'}`);
    logger.info(`  Mode: ${useRealNetwork ? '🌐 REAL NETWORK' : '🎮 SIMULATION'}\n`);

    if (!useRealNetwork) {
        logger.success('✅ Simulation mode active (default)');
        logger.info('\nTo enable REAL network mode:');
        logger.info('1. Edit .env file');
        logger.info('2. Change: ALEO_USE_REAL_NETWORK=false');
        logger.info('3. To:     ALEO_USE_REAL_NETWORK=true');
        logger.info('4. Restart: npm start\n');
    } else {
        logger.success('✅ Real network mode active!');
        logger.info('Transactions will broadcast to Aleo testnet');
        logger.info('⚠️  Requires Aleo credits for transaction fees\n');
    }

    // Test transaction service import
    try {
        logger.info('Testing transaction service...');
        const { default: AleoTransactionService } = await import('./relayer/services/aleo.transaction.service.js');
        const service = new AleoTransactionService();
        logger.success('Transaction service loaded successfully\n');

        // Test creating a transaction
        logger.info('Creating test transaction...');
        const txHash = await service.createRequestTransfer(
            '0.001',
            11155111,
            '0x604e6609a39861162FFAeA37E5fadDd6E91630Bb'
        );

        logger.success(`Transaction created: ${txHash}`);
        logger.success(`Hash format: ${txHash.startsWith('at1') ? 'VALID ✓' : 'INVALID ✗'}`);

        if (useRealNetwork) {
            logger.info('\n🔍 Verify on Aleo Explorer:');
            logger.info(`   https://explorer.aleo.org/transaction/${txHash}`);
        } else {
            logger.info('\n📝 Simulation mode - transaction stored in memory only');
        }

    } catch (error) {
        logger.error('Test failed:', error.message);
        throw error;
    }

    logger.info('\n' + '='.repeat(60));
    logger.success('Network Mode Test Complete!');
    logger.info('='.repeat(60) + '\n');
}

testNetworkModes().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
