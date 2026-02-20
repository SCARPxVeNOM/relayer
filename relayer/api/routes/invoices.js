import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { getTokenById } from "../../services/assets.catalog.js";
import { parseAmountToAtomic } from "../../utils/amounts.js";
import { normalizePhone } from "../../services/otp.service.js";

export async function createInvoice(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const tokenId = String(body.tokenId || "").toUpperCase();
    const amount = String(body.amount || "");
    const memo = body.memo ? String(body.memo) : null;
    const dueAt = body.dueAt ? Number(body.dueAt) : null;
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

    const invoice = appDb.createInvoice({
      creatorUserId: auth.user.id,
      creatorAddress: auth.user.wallet_address,
      recipientUserId: recipientUser?.id,
      recipientPhone,
      recipientAddress,
      tokenId,
      amountAtomic,
      memo,
      dueAt,
      createAleoTxId: aleoTxId,
    });

    sendJson(res, 200, {
      success: true,
      invoice,
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function listInvoices(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }
  sendJson(res, 200, {
    success: true,
    invoices: appDb.listInvoicesForUser(auth.user),
  });
}

export async function payInvoice(req, res, invoiceId) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const aleoTxId = body.aleoTxId ? String(body.aleoTxId) : null;
    const invoice = appDb.getInvoiceById(invoiceId);
    if (!invoice) {
      return sendJson(res, 404, { success: false, error: "Invoice not found" });
    }
    if (invoice.status !== "open") {
      return sendJson(res, 400, { success: false, error: "Invoice is not open" });
    }
    if (invoice.creator_user_id === auth.user.id) {
      return sendJson(res, 400, { success: false, error: "Cannot pay your own invoice" });
    }

    const recipientLockedByUserId = !!invoice.recipient_user_id && invoice.recipient_user_id !== auth.user.id;
    const recipientLockedByPhone =
      !!invoice.recipient_phone && invoice.recipient_phone !== auth.user.phone;
    const recipientLockedByAddress =
      !!invoice.recipient_address && invoice.recipient_address !== auth.user.wallet_address;
    if (recipientLockedByUserId || recipientLockedByPhone || recipientLockedByAddress) {
      return sendJson(res, 403, { success: false, error: "Invoice is assigned to another recipient" });
    }

    const amountAtomic = BigInt(invoice.amount_atomic);
    const payerBalance = appDb.getBalanceAtomic(auth.user.id, invoice.token_id);
    if (payerBalance < amountAtomic) {
      return sendJson(res, 400, { success: false, error: `Insufficient ${invoice.token_id} balance` });
    }

    const runPayment = appDb.transaction(() => {
      appDb.upsertBalanceAtomic(auth.user.id, invoice.token_id, payerBalance - amountAtomic);

      const creatorBalance = appDb.getBalanceAtomic(invoice.creator_user_id, invoice.token_id);
      appDb.upsertBalanceAtomic(invoice.creator_user_id, invoice.token_id, creatorBalance + amountAtomic);

      const payment = appDb.createPayment({
        senderUserId: auth.user.id,
        recipientUserId: invoice.creator_user_id,
        recipientPhone: null,
        recipientAddress: invoice.creator_address,
        tokenId: invoice.token_id,
        amountAtomic,
        note: `Invoice payment: ${invoice.id}`,
        status: "completed",
        aleoTxId,
      });

      appDb.markInvoicePaid(invoice.id, payment.id);
      return payment;
    })();

    sendJson(res, 200, {
      success: true,
      payment: runPayment,
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}
