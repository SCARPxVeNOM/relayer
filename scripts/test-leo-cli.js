/**
 * Test Leo CLI Integration Locally
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testLeoCliIntegration() {
    console.log('🧪 Testing Leo CLI Integration Locally\n');
    console.log('='.repeat(60));

    try {
        // Test: Create intent (will trigger Leo CLI)
        console.log('📝 Creating intent (this will execute Leo CLI)...\n');

        const response = await fetch(`${API_URL}/api/intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: 11155111,
                amount: '0.001',
                recipient: '0x604e6609a39861162FFAeA37E5fadDd6E91630Bb'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Request failed:', error);
            process.exit(1);
        }

        const result = await response.json();
        console.log('✅ Intent created!');
        console.log(`   Transaction ID: ${result.requestId}`);

        if (result.requestId.startsWith('at1')) {
            console.log('✅ Real Aleo transaction hash detected!');
            console.log(`🔍 View on explorer: https://explorer.aleo.org/transaction/${result.requestId}`);
        } else {
            console.log('⚠️  Looks like a fallback ID - check backend logs for Leo CLI execution');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test complete!');
        console.log('\nCheck backend terminal for Leo CLI output');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nMake sure backend is running: cd relayer && node index.js');
        process.exit(1);
    }
}

testLeoCliIntegration();
