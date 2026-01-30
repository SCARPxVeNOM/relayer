/**
 * Intent API - Creates private Aleo intents
 * 
 * Supports TWO modes:
 * 1. Backend-signed: POST /api/intent - Backend creates Aleo tx
 * 2. Hybrid (Leo Wallet): POST /api/intent/register - Frontend signs via Leo Wallet, backend triggers EVM
 */

import { createLogger } from '../utils/logger.js';
import { CHAINS } from '../config.js';
import { ethers } from 'ethers';
import { readJsonBody, sendJson } from './http.js';

const logger = createLogger("IntentAPI");

/**
 * POST /api/intent
 * Create private intent via Aleo (Backend-signed mode)
 * 
 * Frontend sends: { chainId, amount, recipient }
 * Backend: Creates Aleo request_transfer transaction
 * Returns: { requestId }
 */
export async function createIntent(req, res) {
  try {
    const { chainId, amount, recipient } = await readJsonBody(req);

    // Validate input
    if (!chainId || !amount || !recipient) {
      sendJson(res, 400, { error: 'Missing required fields: chainId, amount, recipient' });
      return;
    }

    // Validate chainId
    if (![CHAINS.ETH_SEPOLIA, CHAINS.POLYGON_AMOY].includes(chainId)) {
      sendJson(res, 400, { error: 'Unsupported chainId' });
      return;
    }

    // Validate recipient address
    if (!ethers.isAddress(recipient)) {
      sendJson(res, 400, { error: 'Invalid recipient address' });
      return;
    }

    // Validate amount
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      sendJson(res, 400, { error: 'Invalid amount' });
      return;
    }

    logger.info('Creating intent', { chainId, amount, recipient });

    // Create Aleo request_transfer transaction
    // This calls the Aleo program to create the private intent
    try {
      const AleoTransactionService = (await import('../services/aleo.transaction.service.js')).default;
      const aleoTxService = new AleoTransactionService();

      // Create real Aleo transaction
      const txHash = await aleoTxService.createRequestTransfer(amount, chainId, recipient);
      const requestId = txHash; // Use Aleo transaction hash as request ID

      logger.info('Intent created', { requestId, txHash });

      sendJson(res, 200, { requestId, status: 'pending' });
    } catch (txError) {
      logger.error('Aleo transaction creation failed', txError);

      // Fallback to mock ID if Aleo transaction fails (for development)
      const fallbackId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.warn('Using fallback request ID', { fallbackId });

      sendJson(res, 200, { requestId: fallbackId, status: 'pending', warning: 'Using mock mode' });
    }
  } catch (error) {
    logger.error('Failed to create intent', error);
    sendJson(res, 500, { error: error?.message || 'Internal server error' });
  }
}

/**
 * POST /api/intent/register
 * Register a Leo Wallet-signed intent for EVM execution (Hybrid mode)
 * 
 * Frontend: Signs Aleo tx via Leo Wallet, then calls this endpoint
 * Backend: Receives { txId, chainId, amount, recipient } and triggers EVM send
 * 
 * This allows:
 * - User signs with their own wallet (decentralized)
 * - Backend still handles EVM execution (no user ETH needed)
 */
export async function registerIntent(req, res) {
  try {
    const { txId, chainId, amount, recipient } = await readJsonBody(req);

    // Validate input
    if (!txId || !chainId || !amount || !recipient) {
      sendJson(res, 400, { error: 'Missing required fields: txId, chainId, amount, recipient' });
      return;
    }

    // Validate transaction ID format
    // Leo Wallet can return either:
    // - On-chain Aleo tx ID: starts with 'at1'
    // - Wallet internal tracking ID: UUID format (e.g., '28bd5c10-1d0e-4afb-8518-9f3b81504d02')
    const isAleoTxId = txId.startsWith('at1');
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txId);

    if (!isAleoTxId && !isUUID) {
      sendJson(res, 400, { error: 'Invalid transaction ID format. Expected Aleo tx ID (at1...) or UUID' });
      return;
    }

    // Map chainId string/number to CHAINS constant
    let targetChainId;
    if (chainId === 1 || chainId === '1' || chainId === 11155111 || chainId === '11155111' || chainId === 'sepolia') {
      targetChainId = CHAINS.ETH_SEPOLIA;
    } else if (chainId === 2 || chainId === '2' || chainId === 80002 || chainId === '80002' || chainId === 'amoy') {
      targetChainId = CHAINS.POLYGON_AMOY;
    } else {
      sendJson(res, 400, { error: `Unsupported chainId: ${chainId}` });
      return;
    }

    // Validate recipient address (EVM)
    if (!ethers.isAddress(recipient)) {
      sendJson(res, 400, { error: 'Invalid EVM recipient address' });
      return;
    }

    // Validate amount
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      sendJson(res, 400, { error: 'Invalid amount' });
      return;
    }

    logger.info('🔗 Registering Leo Wallet intent for EVM execution', {
      txId,
      chainId: targetChainId,
      amount,
      recipient
    });

    // Import handleTransferIntent from index.js to trigger EVM execution
    const { handleTransferIntent } = await import('../index.js');

    // Create the intent object matching what Aleo listener produces
    const intent = {
      requestId: txId,  // Use Aleo tx ID as request ID
      chainId: targetChainId,
      amount: amount,
      recipient: recipient,
      source: 'leo-wallet',  // Mark source for tracking
      registeredAt: Date.now(),
    };

    // Queue for EVM execution
    await handleTransferIntent(intent);

    logger.info('✅ Intent registered and queued for EVM execution', { txId, recipient });

    sendJson(res, 200, {
      status: 'queued',
      requestId: txId,
      message: 'Intent registered for EVM execution',
      explorer: `https://testnet.explorer.provable.com/transaction/${txId}`
    });
  } catch (error) {
    logger.error('Failed to register intent', error);
    sendJson(res, 500, { error: error?.message || 'Internal server error' });
  }
}

