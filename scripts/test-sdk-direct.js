/**
 * Direct SDK Test - Simplified with full error capture
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
import fs from 'fs';

const PRIVATE_KEY = 'APrivateKey1zkp3z7V6oJX3RtJeND6sLsUCKnJdqBs86MV8qdDvK1X7KD3';
const PROGRAM_ID = 'privacy_box_mvp.aleo';
const NETWORK_URL = 'https://api.explorer.provable.com/v1';

async function testSDK() {
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync('sdk-test.log', msg + '\n');
    };

    log('=== SDK TEST ===');
    log(new Date().toISOString());

    try {
        log('\n1. Initializing WASM...');
        await initializeWasm();
        log('   WASM OK');

        log('\n2. Creating account...');
        const account = new Account({ privateKey: PRIVATE_KEY });
        log(`   Address: ${account.address().toString()}`);

        log('\n3. Creating PrivateKey object...');
        const privateKeyObject = PrivateKey.from_string(PRIVATE_KEY);
        log('   PrivateKey OK');

        log('\n4. Creating network client...');
        const networkClient = new AleoNetworkClient(NETWORK_URL);
        log('   Network client OK');

        log('\n5. Testing network connection...');
        const height = await networkClient.getLatestHeight();
        log(`   Latest block: ${height}`);

        log('\n6. Checking if program exists...');
        try {
            const program = await networkClient.getProgram(PROGRAM_ID);
            log(`   Program found! Length: ${program.length} chars`);
            log(`   First 200 chars: ${program.substring(0, 200)}`);
        } catch (e) {
            log(`   Program NOT found: ${e.message}`);
            log('   Exiting - program must be deployed first');
            return;
        }

        log('\n7. Creating providers...');
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        const recordProvider = new NetworkRecordProvider(account, networkClient);
        log('   Providers OK');

        log('\n8. Creating ProgramManager...');
        const programManager = new ProgramManager(NETWORK_URL, keyProvider, recordProvider);
        programManager.setAccount(account);
        log('   ProgramManager OK');

        log('\n9. Preparing execution...');
        // Use proper Aleo address format for the dest parameter
        const destAddress = account.address().toString();
        const inputs = ['1000000u64', '1u8', destAddress];
        log(`   Inputs: ${JSON.stringify(inputs)}`);

        log('\n10. Executing create_intent...');
        const txId = await programManager.execute(
            PROGRAM_ID,
            'create_intent',
            500000, // fee
            false,  // privateFee
            inputs,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            privateKeyObject
        );

        log(`\n=== SUCCESS ===`);
        log(`Transaction ID: ${txId}`);
        log(`Explorer: https://explorer.aleo.org/transaction/${txId}`);

    } catch (error) {
        log(`\n=== ERROR ===`);
        log(`Message: ${error.message}`);
        log(`Stack: ${error.stack}`);
        fs.writeFileSync('sdk-error.json', JSON.stringify({
            message: error.message,
            stack: error.stack,
            name: error.name
        }, null, 2));
    }
}

testSDK();
