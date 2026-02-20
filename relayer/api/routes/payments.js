import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { getTokenById } from "../../services/assets.catalog.js";
import { parseAmountToAtomic } from "../../utils/amounts.js";
import { normalizePhone } from "../../services/otp.service.js";

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

    let recipientPhone = null;
    if (body.recipientPhone) {
      recipientPhone = normalizePhone(String(body.recipientPhone));
    }
    const recipientAddress = body.recipientAddress ? String(body.recipientAddress) : null;
    if (!recipientPhone && !recipientAddress) {
      return sendJson(res, 400, { success: false, error: "recipientPhone or recipientAddress is required" });
    }

    const token = getTokenById(tokenId);
    if (!token) {
      return sendJson(res, 400, { success: false, error: "Unsupported token" });
    }

    const amountAtomic = parseAmountToAtomic(amount, token.decimals);
    if (amountAtomic <= 0n) {
      return sendJson(res, 400, { success: false, error: "Amount must be greater than zero" });
    }

    let recipientUser = null;
    if (recipientPhone) {
      recipientUser = appDb.getUserByPhone(recipientPhone);
    } else if (recipientAddress) {
      recipientUser = appDb.getUserByAddress(recipientAddress);
    }

    const senderBalance = appDb.getBalanceAtomic(auth.user.id, tokenId);
    if (senderBalance < amountAtomic) {
      return sendJson(res, 400, { success: false, error: `Insufficient ${tokenId} balance` });
    }

    const transfer = appDb.transaction(() => {
      appDb.upsertBalanceAtomic(auth.user.id, tokenId, senderBalance - amountAtomic);
      if (recipientUser) {
        const recipientBalance = appDb.getBalanceAtomic(recipientUser.id, tokenId);
        appDb.upsertBalanceAtomic(recipientUser.id, tokenId, recipientBalance + amountAtomic);
      }

      return appDb.createPayment({
        senderUserId: auth.user.id,
        recipientUserId: recipientUser?.id,
        recipientPhone,
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
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function listPayments(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  sendJson(res, 200, {
    success: true,
    payments: appDb.listPayments(auth.user.id),
  });
}
