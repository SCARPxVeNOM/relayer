/**
 * Test privacy_barrier.aleo execution
 */

import {
    Account,
    AleoNetworkClient,
    NetworkRecordProvider,
    ProgramManager,
    AleoKeyProvider,
    PrivateKey
} from '@provablehq/sdk';
import fs from 'fs';

const PRIVATE_KEY = 'APrivateKey1zkp3z7V6oJX3RtJeND6sLsUCKnJdqBs86MV8qdDvK1X7KD3';
const PROGRAM_ID = 'privacy_barrier.aleo';
const NETWORK_URL = 'https://api.explorer.provable.com/v1';

async function test() {
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync('test-barrier.log', msg + '\n');
    };

    fs.writeFileSync('test-barrier.log', '');
    log('=== Testing privacy_barrier.aleo ===');
    log(new Date().toISOString());

    try {
        log('\n1. Creating account...');
        const account = new Account({ privateKey: PRIVATE_KEY });
        const address = account.address().to_string();
        log(`   Address: ${address}`);

        log('\n2. Creating PrivateKey...');
        const privateKeyObject = PrivateKey.from_string(PRIVATE_KEY);
        log('   OK');

        log('\n3. Creating network client...');
        const networkClient = new AleoNetworkClient(NETWORK_URL);
        const height = await networkClient.getLatestHeight();
        log(`   Block height: ${height}`);

        log('\n4. Checking program...');
        const program = await networkClient.getProgram(PROGRAM_ID);
        log(`   Program found! ${program.length} chars`);

        log('\n5. Setting up providers...');
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        const recordProvider = new NetworkRecordProvider(account, networkClient);
        log('   OK');

        log('\n6. Creating ProgramManager...');
        const programManager = new ProgramManager(NETWORK_URL, keyProvider, recordProvider);
        programManager.setAccount(account);
        log('   OK');

        log('\n7. Preparing execution...');
        const inputs = ['1000000u64', '1u8', address];
        log(`   Function: create_intent`);
        log(`   Inputs: ${JSON.stringify(inputs)}`);

        log('\n8. Executing on testnet...');
        const txId = await programManager.execute(
            PROGRAM_ID,
            'create_intent',
            500000, // 0.5 credits fee
            false,
            inputs,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            privateKeyObject
        );

        log('\n=== SUCCESS ===');
        log(`Transaction ID: ${txId}`);
        log(`Explorer: https://explorer.aleo.org/transaction/${txId}`);

    } catch (error) {
        log('\n=== ERROR ===');
        log(`Message: ${error.message}`);
        log(`Stack: ${error.stack}`);
    }
}

test();
