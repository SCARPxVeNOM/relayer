/**
 * Intent API - Creates private Aleo intents
 * 
 * This endpoint is the ONLY way frontend creates execution intents.
 * Backend handles all Aleo transactions and EVM execution.
 */

import { createLogger } from '../utils/logger.js';
import { CHAINS } from '../config.js';
import { ethers } from 'ethers';
import { readJsonBody, sendJson } from './http.js';

const logger = createLogger("IntentAPI");

/**
 * POST /api/intent
 * Create private intent via Aleo
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

