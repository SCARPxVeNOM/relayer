/**
 * Deploy Aleo Program to Testnet using SDK (Simplified)
 * Based on official docs - no thread pool initialization needed
 */

import { Account, AleoNetworkClient, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployProgram() {
    console.log('🚀 Deploying Privacy Box to Aleo Testnet\n');

    try {
        // Initialize account
        const privateKey = 'APrivateKey1zkp3z7V6oJX3RtJeND6sLsUCKnJdqBs86MV8qdDvK1X7KD3';
        const account = new Account({ privateKey });
        console.log(`✅ Account: ${account.address().toString()}\n`);

        // Create network client
        const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
        console.log('✅ Network client connected\n');

        // Create key provider
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);

        // Create program manager
        const programManager = new ProgramManager("https://api.explorer.provable.com/v1", keyProvider);
        programManager.setAccount(account);
        console.log('✅ Program manager ready\n');

        // Load compiled program
        const programPath = join(__dirname, '../aleo/privacy_box/build/main.aleo');
        const program = readFileSync(programPath, 'utf-8');

        console.log('📄 Program loaded\n');

        // Deploy with fee
        const fee = 5.0; // 5 Aleo credits
        console.log(`💰 Fee: ${fee} Aleo credits\n`);
        console.log('🚀 Deploying... (this may take 2-3 minutes)\n');

        const transactionId = await programManager.deploy(program, fee, false);

        console.log('✅ DEPLOYMENT SUCCESSFUL!\n');
        console.log('─'.repeat(60));
        console.log(`Transaction ID: ${transactionId}`);
        console.log(`Explorer: https://explorer.aleo.org/transaction/${transactionId}`);
        console.log('─'.repeat(60));

        console.log('\n🎉 Program deployed to Aleo testnet!');

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    }
}

deployProgram();
