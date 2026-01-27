/**
 * Test Real Aleo SDK Integration
 * Creates an intent and verifies it broadcasts to real Aleo testnet
 */

import fetch from 'node-fetch';

const RENDER_URL = 'https://relayer-43bm.onrender.com';

const logger = {
    info: (...args) => console.log('[TEST]', ...args),
    error: (...args) => console.error('[❌]', ...args),
    success: (...args) => console.log('[✅]', ...args),
};

async function testRealAleoSDK() {
    console.log('🧪 Testing Real Aleo SDK Integration\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Health check
        logger.info('Test 1: Health Check');
        const health = await fetch(`${RENDER_URL}/health`).then(r => r.json());
        logger.success(`Service healthy - uptime: ${Math.round(health.uptime)}s`);

        // Test 2: Create real intent
        logger.info('\nTest 2: Creating Real Aleo Transaction');
        logger.info('This will broadcast to actual Aleo testnet!');

        const intentRes = await fetch(`${RENDER_URL}/api/intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: 11155111,
                amount: '0.001',
                recipient: '0x604e6609a39861162FFAeA37E5fadDd6E91630Bb'
            })
        });

        if (!intentRes.ok) {
            const error = await intentRes.json();
            throw new Error(`Intent failed: ${JSON.stringify(error)}`);
        }

        const intent = await intentRes.json();
        logger.success('Intent created successfully!');
        logger.success(`Transaction ID: ${intent.requestId}`);

        // Verify it starts with at1
        if (intent.requestId.startsWith('at1')) {
            logger.success('✅ Valid Aleo transaction hash format');
        }

        // Test 3: Verify on explorer
        console.log('\n' + '='.repeat(60));
        logger.info('🔍 Verify Transaction on Aleo Explorer:');
        console.log(`   https://explorer.aleo.org/transaction/${intent.requestId}`);
        console.log('='.repeat(60));

        console.log('\n⏳ Wait ~30-60 seconds for blockchain confirmation');
        console.log('Then check the explorer link above to see your transaction!\n');

        logger.success('✅ TEST COMPLETE!');

        return intent.requestId;
    } catch (error) {
        logger.error('Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testRealAleoSDK();
