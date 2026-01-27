/**
 * End-to-End Test Script
 * 
 * Tests the complete flow:
 * 1. Create Aleo intent via API
 * 2. Verify transaction created
 * 3. Check relayer pickup
 */

import fetch from 'node-fetch';

const API_BASE = process.env.RELAYER_API_URL || 'http://localhost:3001';

const logger = {
    info: (...args) => console.log('[TEST]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    success: (...args) => console.log('[✓]', ...args),
};

async function testEndToEnd() {
    logger.info('Starting End-to-End Integration Test...\n');

    try {
        // Test 1: Health check
        logger.info('Test 1: Checking relayer health');
        const healthRes = await fetch(`${API_BASE}/health`);
        const health = await healthRes.json();
        logger.success(`Relayer status: ${health.status}`);
        logger.success(`Uptime: ${Math.round(health.uptime)}s`);

        // Test 2: Session init
        logger.info('\nTest 2: Initializing control session');
        const sessionRes = await fetch(`${API_BASE}/api/session/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const session = await sessionRes.json();
        logger.success(`Session ID: ${session.sessionId}`);
        logger.success(`Session active: ${session.active}`);

        // Test 3: Create intent
        logger.info('\nTest 3: Creating transfer intent');
        const intentPayload = {
            chainId: 11155111, // Sepolia
            amount: '0.001',
            recipient: '0x604e6609a39861162FFAeA37E5fadDd6E91630Bb',
        };

        const intentRes = await fetch(`${API_BASE}/api/intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(intentPayload),
        });

        if (!intentRes.ok) {
            const error = await intentRes.json();
            throw new Error(`Intent creation failed: ${error.error}`);
        }

        const intent = await intentRes.json();
        logger.success(`Request ID: ${intent.requestId}`);
        logger.success(`Status: ${intent.status}`);

        if (intent.warning) {
            logger.info(`Warning: ${intent.warning}`);
        }

        // Test 4: Check telemetry
        logger.info('\nTest 4: Checking system telemetry');
        const telemetryRes = await fetch(`${API_BASE}/api/telemetry`);
        const telemetry = await telemetryRes.json();
        logger.success(`Bridge Link: ${telemetry.bridgeLink}`);
        logger.success(`Encryption Engine: ${telemetry.encryptionEngine}`);
        logger.success(`Network Orientation: [${telemetry.networkOrientation.join(', ')}]`);

        // Test 5: Wait and check status
        logger.info('\nTest 5: Waiting for transaction processing...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusRes = await fetch(`${API_BASE}/status`);
        const status = await statusRes.json();
        logger.info('Relayer Status:', JSON.stringify(status.queues, null, 2));

        logger.info('\n=================================');
        logger.success('End-to-End Test Complete! ✓');
        logger.info('=================================\n');

        logger.info('Check relayer logs for:');
        logger.info('  - "Created transfer intent"');
        logger.info('  - "Extracted transfer intent"');
        logger.info('  - "Executing batch" (within 30-60 seconds)');

    } catch (error) {
        logger.error('\nTest Failed:', error.message);
        process.exit(1);
    }
}

// Check if relayer is running
async function checkRelayerRunning() {
    try {
        await fetch(`${API_BASE}/health`, { timeout: 2000 });
        return true;
    } catch {
        return false;
    }
}

// Main
(async () => {
    const isRunning = await checkRelayerRunning();
    if (!isRunning) {
        logger.error(`\nRelayer not running on ${API_BASE}`);
        logger.info('Please start the relayer first:');
        logger.info('  npm start\n');
        process.exit(1);
    }

    await testEndToEnd();
})();
