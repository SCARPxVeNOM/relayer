import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { getTokenById } from "../../services/assets.catalog.js";
import { parseAmountToAtomic, formatAtomicToDecimal } from "../../utils/amounts.js";
import { buildSwapQuote, executeSwap } from "../../services/swap.service.js";
import { verifySwapExecutionTx } from "../../services/aleo.feature.tx.service.js";
import { isOnchainLedgerMode } from "../../services/onchain.mode.service.js";

export async function getSwapQuote(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const tokenIn = String(body.tokenIn || "").toUpperCase();
    const tokenOut = String(body.tokenOut || "").toUpperCase();
    const amount = body.amount;

    if (!tokenIn || !tokenOut || amount === undefined) {
      return sendJson(res, 400, { success: false, error: "tokenIn, tokenOut, and amount are required" });
    }
    if (tokenIn === tokenOut) {
      return sendJson(res, 400, { success: false, error: "tokenIn and tokenOut must differ" });
    }

    const inToken = getTokenById(tokenIn);
    const outToken = getTokenById(tokenOut);
    if (!inToken || !outToken) {
      return sendJson(res, 400, { success: false, error: "Unsupported token pair" });
    }

    const amountInAtomic = parseAmountToAtomic(String(amount), inToken.decimals);
    if (amountInAtomic <= 0n) {
      return sendJson(res, 400, { success: false, error: "Amount must be greater than zero" });
    }

    const quote = buildSwapQuote({
      tokenIn,
      tokenOut,
      amountInAtomic,
      userId: auth.user.id,
    });
    const onchainLedger = isOnchainLedgerMode();

    sendJson(res, 200, {
      success: true,
      quote: {
        id: quote.id,
        tokenIn: quote.token_in,
        tokenOut: quote.token_out,
        amountInAtomic: quote.amount_in_atomic,
        amountOutAtomic: quote.amount_out_atomic,
        amountIn: formatAtomicToDecimal(quote.amount_in_atomic, inToken.decimals),
        amountOut: formatAtomicToDecimal(quote.amount_out_atomic, outToken.decimals),
        rate: quote.rate,
        feeBps: quote.fee_bps,
        expiresAt: quote.expires_at,
      },
      ledgerMode: onchainLedger ? "onchain_canonical" : "backend_simulated",
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function postSwapExecute(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const quoteId = body.quoteId;
    const maxSlippageBps = Number(body.maxSlippageBps ?? 100);
    const aleoTxId = body.aleoTxId ? String(body.aleoTxId) : null;

    if (!quoteId) {
      return sendJson(res, 400, { success: false, error: "quoteId is required" });
    }
    if (!aleoTxId) {
      return sendJson(res, 400, { success: false, error: "aleoTxId is required for on-chain-confirmed settlement" });
    }

    const quote = appDb.getSwapQuoteById(quoteId);
    if (!quote || quote.user_id !== auth.user.id) {
      return sendJson(res, 404, { success: false, error: "Quote not found" });
    }
    if (quote.expires_at <= Date.now()) {
      return sendJson(res, 400, { success: false, error: "Quote expired" });
    }

    const verification = await verifySwapExecutionTx({
      txId: aleoTxId,
      walletAddress: auth.user.wallet_address,
    });

    const onchainLedger = isOnchainLedgerMode();
    const swap = onchainLedger
      ? appDb.createSwap({
          userId: auth.user.id,
          quoteId: quote.id,
          tokenIn: quote.token_in,
          tokenOut: quote.token_out,
          amountInAtomic: BigInt(quote.amount_in_atomic),
          amountOutAtomic: BigInt(quote.amount_out_atomic),
          rate: quote.rate,
          feeBps: quote.fee_bps,
          aleoTxId,
        })
      : executeSwap({
          userId: auth.user.id,
          quote,
          maxSlippageBps,
          aleoTxId,
        });

    sendJson(res, 200, {
      success: true,
      swap: {
        id: swap.id,
        tokenIn: swap.token_in,
        tokenOut: swap.token_out,
        amountInAtomic: swap.amount_in_atomic,
        amountOutAtomic: swap.amount_out_atomic,
        rate: swap.rate,
        feeBps: swap.fee_bps,
        aleoTxId: swap.aleo_tx_id,
        txProgramId: verification?.matchedTransition?.programId || null,
        txFunctionName: verification?.matchedTransition?.functionName || null,
        status: swap.status,
        createdAt: swap.created_at,
      },
      balances: onchainLedger ? [] : appDb.listBalances(auth.user.id),
      ledgerMode: onchainLedger ? "onchain_canonical" : "backend_simulated",
    });
  } catch (error) {
    sendJson(res, error?.statusCode || 400, {
      success: false,
      error: error.message,
      ...(error?.txState ? { txState: error.txState } : {}),
      ...(error?.rawStatus ? { txStatus: error.rawStatus } : {}),
    });
  }
}

export async function listSwaps(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }
  sendJson(res, 200, {
    success: true,
    swaps: appDb.listSwaps(auth.user.id),
  });
}
