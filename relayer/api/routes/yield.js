import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { getTokenById } from "../../services/assets.catalog.js";
import { getYieldAssetById } from "../../services/yield.catalog.js";
import { getYieldAssets, buildYieldQuote, solveYieldQuote } from "../../services/yield.service.js";
import { formatBalanceRow, parseAmountToAtomic } from "../../utils/amounts.js";
import { verifyYieldTransitionTx } from "../../services/aleo.feature.tx.service.js";
import { isOnchainLedgerMode } from "../../services/onchain.mode.service.js";

function parseLimit(rawLimit, fallback = 25, max = 200) {
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(max, Math.floor(parsed));
}

function safeJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapPosition(row) {
  return {
    userId: row.user_id,
    assetId: row.asset_id,
    tokenId: row.token_id,
    rewardTokenId: row.reward_token_id,
    stakedAtomic: row.staked_atomic,
    unclaimedAtomic: row.unclaimed_atomic,
    lastAccrualAt: row.last_accrual_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuoteRow(row) {
  return {
    id: row.id,
    action: row.action,
    intent: safeJson(row.intent_json, {}),
    plan: safeJson(row.plan_json, {}),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function mapActionRow(row) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    action: row.action,
    status: row.status,
    aleoTxId: row.aleo_tx_id,
    plan: safeJson(row.plan_json, {}),
    createdAt: row.created_at,
  };
}

function normalizeIntent(body) {
  const base = body?.intent && typeof body.intent === "object" ? body.intent : body;
  const action = String(base?.action || "")
    .toLowerCase()
    .trim();
  if (!action) {
    throw new Error("action is required");
  }

  if (action === "stake" || action === "unstake") {
    const assetId = String(base.assetId || "").trim();
    if (!assetId) {
      throw new Error("assetId is required for stake/unstake");
    }
    const asset = getYieldAssetById(assetId);
    if (!asset) {
      throw new Error("Unsupported yield asset");
    }

    let amountAtomic;
    if (base.amountAtomic !== undefined && base.amountAtomic !== null) {
      amountAtomic = BigInt(base.amountAtomic).toString();
    } else if (base.amount !== undefined && base.amount !== null) {
      const token = getTokenById(asset.tokenId);
      if (!token) {
        throw new Error(`Unsupported token for asset ${assetId}`);
      }
      amountAtomic = parseAmountToAtomic(String(base.amount), token.decimals).toString();
    } else {
      throw new Error("amount or amountAtomic is required for stake/unstake");
    }

    return {
      action,
      assetId,
      amountAtomic,
    };
  }

  if (action === "claim") {
    const out = { action };
    if (base.assetId) {
      out.assetId = String(base.assetId);
    }
    return out;
  }

  if (action === "rebalance") {
    if (!base.targetWeights || typeof base.targetWeights !== "object" || Array.isArray(base.targetWeights)) {
      throw new Error("targetWeights is required for rebalance");
    }
    return {
      action,
      targetWeights: base.targetWeights,
    };
  }

  throw new Error("action must be one of: stake, unstake, claim, rebalance");
}

export async function yieldGetAssets(req, res, url) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const tokenId = String(url.searchParams.get("tokenId") || "")
      .trim()
      .toUpperCase();
    const payload = getYieldAssets({
      userId: auth.user.id,
      tokenId: tokenId || undefined,
    });
    const onchainLedger = isOnchainLedgerMode();

    sendJson(res, 200, {
      success: true,
      assets: payload.assets || [],
      positions: (payload.positions || []).map(mapPosition),
      quotes: (payload.quotes || []).map(mapQuoteRow),
      actions: (payload.actions || []).map(mapActionRow),
      ledgerMode: onchainLedger ? "onchain_canonical" : "backend_simulated",
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function yieldGetQuote(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const intent = normalizeIntent(body);
    const quote = buildYieldQuote({
      userId: auth.user.id,
      intent,
    });

    sendJson(res, 200, {
      success: true,
      quote,
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function yieldSolve(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const quoteId = String(body.quoteId || "").trim();
    const aleoTxId = body.aleoTxId ? String(body.aleoTxId) : null;
    const aleoTxIds = Array.isArray(body.aleoTxIds)
      ? body.aleoTxIds.map((v) => String(v || "").trim()).filter(Boolean)
      : [];

    if (!quoteId) {
      return sendJson(res, 400, { success: false, error: "quoteId is required" });
    }
    if (!aleoTxId && aleoTxIds.length === 0) {
      return sendJson(res, 400, {
        success: false,
        error: "aleoTxId or aleoTxIds[] is required for on-chain-confirmed yield settlement",
      });
    }

    const quote = appDb.getYieldQuoteById(quoteId);
    if (!quote || quote.user_id !== auth.user.id) {
      return sendJson(res, 404, { success: false, error: "Yield quote not found" });
    }
    const plan = safeJson(quote.plan_json, {});
    const plannedTransitions = Array.isArray(plan?.transitions) ? plan.transitions : [];
    if (plannedTransitions.length === 0) {
      return sendJson(res, 422, {
        success: false,
        error: "Yield quote has no transition plan to verify",
      });
    }

    const txIdsToVerify = aleoTxIds.length > 0 ? aleoTxIds : [aleoTxId];
    if (txIdsToVerify.length !== plannedTransitions.length) {
      return sendJson(res, 400, {
        success: false,
        error: `Yield solve requires ${plannedTransitions.length} confirmed Aleo tx ids matching the quote transitions`,
      });
    }

    for (let index = 0; index < plannedTransitions.length; index += 1) {
      const transition = plannedTransitions[index] || {};
      const txId = txIdsToVerify[index];
      await verifyYieldTransitionTx({
        txId,
        walletAddress: auth.user.wallet_address,
        programId: transition.programId,
        functionName: transition.functionName,
      });
    }

    const onchainLedger = isOnchainLedgerMode();
    const result = onchainLedger
      ? (() => {
          const action = appDb.createYieldAction({
            userId: auth.user.id,
            quoteId: quote.id,
            action: plan.action || quote.action,
            status: "onchain_confirmed",
            aleoTxId: txIdsToVerify[txIdsToVerify.length - 1],
            planJson: quote.plan_json,
          });
          return {
            action,
            plan,
            positions: [],
            balances: [],
          };
        })()
      : solveYieldQuote({
          userId: auth.user.id,
          quote,
          aleoTxId: txIdsToVerify[txIdsToVerify.length - 1],
        });

    sendJson(res, 200, {
      success: true,
      action: mapActionRow(result.action),
      plan: result.plan,
      positions: (result.positions || []).map(mapPosition),
      balances: (result.balances || []).map(formatBalanceRow),
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

export async function listYieldQuotes(req, res, url) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  const limit = parseLimit(url.searchParams.get("limit"), 20, 200);
  const rows = appDb.listYieldQuotes(auth.user.id, limit).map(mapQuoteRow);
  sendJson(res, 200, {
    success: true,
    quotes: rows,
  });
}

export async function listYieldActions(req, res, url) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  const limit = parseLimit(url.searchParams.get("limit"), 30, 200);
  const rows = appDb.listYieldActions(auth.user.id, limit).map(mapActionRow);
  sendJson(res, 200, {
    success: true,
    actions: rows,
  });
}
