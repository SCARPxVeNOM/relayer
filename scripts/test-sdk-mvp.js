/**
 * Direct SDK Test - Test using already deployed privacy_box_mvp.aleo
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
        fs.appendFileSync('sdk-test-mvp.log', msg + '\n');
    };

    // Clear log
    fs.writeFileSync('sdk-test-mvp.log', '');

    log('=== SDK TEST with privacy_box_mvp.aleo ===');
    log(new Date().toISOString());

    try {
        log('\n1. Initializing WASM...');
        await initializeWasm();
        log('   WASM OK');

        log('\n2. Creating account...');
        const account = new Account({ privateKey: PRIVATE_KEY });
        const address = account.address().to_string();
        log(`   Address: ${address}`);

        log('\n3. Creating PrivateKey object...');
        const privateKeyObject = PrivateKey.from_string(PRIVATE_KEY);
        log('   PrivateKey OK');

        log('\n4. Creating network client...');
        const networkClient = new AleoNetworkClient(NETWORK_URL);
        log('   Network client OK');

        log('\n5. Testing network connection...');
        const height = await networkClient.getLatestHeight();
        log(`   Latest block: ${height}`);

        log('\n6. Checking program...');
        const program = await networkClient.getProgram(PROGRAM_ID);
        log(`   Program found! Length: ${program.length} chars`);

        log('\n7. Creating providers...');
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        const recordProvider = new NetworkRecordProvider(account, networkClient);
        log('   Providers OK');

        log('\n8. Creating ProgramManager...');
        const programManager = new ProgramManager(NETWORK_URL, keyProvider, recordProvider);
        programManager.setAccount(account);
        log('   ProgramManager OK');

        log('\n9. Preparing init execution...');
        // init(address, u64) -> Vault.record
        const inputs = [address, '1000000u64'];
        log(`   Function: init`);
        log(`   Inputs: ${JSON.stringify(inputs)}`);

        log('\n10. Executing init...');
        const fee = 500000; // 0.5 Aleo credits

        const txId = await programManager.execute(
            PROGRAM_ID,
            'init',
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

        log(`\n=== SUCCESS ===`);
        log(`Transaction ID: ${txId}`);
        log(`Explorer: https://explorer.aleo.org/transaction/${txId}`);

    } catch (error) {
        log(`\n=== ERROR ===`);
        log(`Message: ${error.message}`);
        log(`Stack: ${error.stack}`);
        fs.writeFileSync('sdk-error-mvp.json', JSON.stringify({
            message: error.message,
            stack: error.stack,
            name: error.name
        }, null, 2));
    }
}

testSDK();
