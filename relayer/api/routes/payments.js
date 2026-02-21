import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { getTokenById } from "../../services/assets.catalog.js";
import { parseAmountToAtomic } from "../../utils/amounts.js";
import { normalizePhone } from "../../services/otp.service.js";
import { verifyPaymentSettlementTx } from "../../services/aleo.feature.tx.service.js";
import { resolveUsernameToWallet } from "../../services/identity.directory.service.js";
import { isOnchainLedgerMode } from "../../services/onchain.mode.service.js";

export async function sendPayment(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const tokenId = String(body.tokenId || "").toUpperCase();
    const amount = String(body.amount || "");
    const note = body.note ? String(body.note) : null;
    const aleoTxId = body.aleoTxId ? String(body.aleoTxId) : null;
    if (!aleoTxId) {
      return sendJson(res, 400, { success: false, error: "aleoTxId is required for on-chain-confirmed payment settlement" });
    }

    let recipientPhone = null;
    let recipientUsername = null;
    let recipientAddress = body.recipientAddress ? String(body.recipientAddress) : null;
    let recipientUser = null;

    if (body.recipientUsername) {
      const resolvedIdentity = resolveUsernameToWallet(String(body.recipientUsername));
      if (!resolvedIdentity?.walletAddress) {
        return sendJson(res, 404, {
          success: false,
          error: "No on-chain username claim found for this username",
        });
      }
      recipientUsername = resolvedIdentity.username;
      recipientAddress = resolvedIdentity.walletAddress;
      recipientUser = resolvedIdentity.userId ? appDb.getUserById(resolvedIdentity.userId) : null;
      recipientPhone =
        recipientUser?.phone && !String(recipientUser.phone).startsWith("wallet:")
          ? recipientUser.phone
          : null;
    }

    if (body.recipientPhone) {
      recipientPhone = normalizePhone(String(body.recipientPhone));
    }

    if (!recipientUsername && !recipientPhone && !recipientAddress) {
      return sendJson(res, 400, {
        success: false,
        error: "recipientUsername, recipientPhone, or recipientAddress is required",
      });
    }

    const token = getTokenById(tokenId);
    if (!token) {
      return sendJson(res, 400, { success: false, error: "Unsupported token" });
    }

    const amountAtomic = parseAmountToAtomic(amount, token.decimals);
    if (amountAtomic <= 0n) {
      return sendJson(res, 400, { success: false, error: "Amount must be greater than zero" });
    }

    if (!recipientUser && recipientPhone) {
      recipientUser = appDb.getUserByPhone(recipientPhone);
    } else if (!recipientUser && recipientAddress) {
      recipientUser = appDb.getUserByAddress(recipientAddress);
    }

    const verification = await verifyPaymentSettlementTx({
      txId: aleoTxId,
      walletAddress: auth.user.wallet_address,
    });
    const onchainLedger = isOnchainLedgerMode();

    const transfer = onchainLedger
      ? appDb.createPayment({
          senderUserId: auth.user.id,
          recipientUserId: recipientUser?.id,
          recipientPhone,
          recipientUsername,
          recipientAddress,
          tokenId,
          amountAtomic,
          note,
          status: "onchain_confirmed",
          aleoTxId,
        })
      : appDb.transaction(() => {
          const senderBalance = appDb.getBalanceAtomic(auth.user.id, tokenId);
          if (senderBalance < amountAtomic) {
            throw new Error(`Insufficient ${tokenId} balance`);
          }
          appDb.upsertBalanceAtomic(auth.user.id, tokenId, senderBalance - amountAtomic);
          if (recipientUser) {
            const recipientBalance = appDb.getBalanceAtomic(recipientUser.id, tokenId);
            appDb.upsertBalanceAtomic(recipientUser.id, tokenId, recipientBalance + amountAtomic);
          }

          return appDb.createPayment({
            senderUserId: auth.user.id,
            recipientUserId: recipientUser?.id,
            recipientPhone,
            recipientUsername,
            recipientAddress,
            tokenId,
            amountAtomic,
            note,
            status: recipientUser ? "completed" : "pending_recipient",
            aleoTxId,
          });
        })();

    sendJson(res, 200, {
      success: true,
      payment: transfer,
      txProgramId: verification?.matchedTransition?.programId || null,
      txFunctionName: verification?.matchedTransition?.functionName || null,
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

export async function listPayments(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  sendJson(res, 200, {
    success: true,
    payments: appDb.listPayments(auth.user),
  });
}
