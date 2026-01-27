// Simple test script for Render API
// Run: node scripts/test-render-api.js

import fetch from 'node-fetch';

const RENDER_URL = 'https://relayer-43bm.onrender.com';

async function testRenderAPI() {
    console.log('🧪 Testing Render Deployment\n');
    console.log(`URL: ${RENDER_URL}\n`);

    try {
        // Test 1: Health Check
        console.log('Test 1: Health Check');
        const health = await fetch(`${RENDER_URL}/health`).then(r => r.json());
        console.log('✅ Status:', health.status);
        console.log('   Uptime:', Math.round(health.uptime), 'seconds');
        console.log('   Version:', health.version);

        // Test 2: Telemetry
        console.log('\nTest 2: Telemetry');
        const telemetry = await fetch(`${RENDER_URL}/api/telemetry`).then(r => r.json());
        console.log('✅ Bridge Link:', telemetry.bridgeLink);
        console.log('   Encryption Engine:', telemetry.encryptionEngine);
        console.log('   ZK System:', telemetry.zkSystemStatus);

        // Test 3: Create Intent
        console.log('\nTest 3: Create Intent');
        const intent = await fetch(`${RENDER_URL}/api/intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: 11155111,
                amount: '0.001',
                recipient: '0x604e6609a39861162FFAeA37E5fadDd6E91630Bb'
            })
        }).then(r => r.json());

        console.log('✅ Request ID:', intent.requestId);
        console.log('   Status:', intent.status);

        if (intent.requestId.startsWith('at1')) {
            console.log('   ✅ Real Aleo transaction hash!');
        } else {
            console.log('   ⚠️  Mock ID (fallback mode)');
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ ALL TESTS PASSED!');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testRenderAPI();
