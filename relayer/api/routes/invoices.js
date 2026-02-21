import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { getTokenById } from "../../services/assets.catalog.js";
import { parseAmountToAtomic } from "../../utils/amounts.js";
import { normalizePhone } from "../../services/otp.service.js";
import { verifyInvoiceCreateTx, verifyInvoicePayTx } from "../../services/aleo.feature.tx.service.js";
import { resolveUsernameToWallet } from "../../services/identity.directory.service.js";
import { isOnchainLedgerMode } from "../../services/onchain.mode.service.js";

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
    if (!aleoTxId) {
      return sendJson(res, 400, { success: false, error: "aleoTxId is required for on-chain-confirmed invoice creation" });
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

    const verification = await verifyInvoiceCreateTx({
      txId: aleoTxId,
      walletAddress: auth.user.wallet_address,
    });

    const invoice = appDb.createInvoice({
      creatorUserId: auth.user.id,
      creatorAddress: auth.user.wallet_address,
      recipientUserId: recipientUser?.id,
      recipientPhone,
      recipientUsername,
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
      txProgramId: verification?.matchedTransition?.programId || null,
      txFunctionName: verification?.matchedTransition?.functionName || null,
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
    if (!aleoTxId) {
      return sendJson(res, 400, { success: false, error: "aleoTxId is required for on-chain-confirmed invoice payment settlement" });
    }
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
    const recipientLockedByUsername =
      !!invoice.recipient_username && invoice.recipient_username !== auth.user.username;
    const recipientLockedByAddress =
      !!invoice.recipient_address && invoice.recipient_address !== auth.user.wallet_address;
    if (recipientLockedByUserId || recipientLockedByPhone || recipientLockedByUsername || recipientLockedByAddress) {
      return sendJson(res, 403, { success: false, error: "Invoice is assigned to another recipient" });
    }

    const verification = await verifyInvoicePayTx({
      txId: aleoTxId,
      walletAddress: auth.user.wallet_address,
    });
    const amountAtomic = BigInt(invoice.amount_atomic);
    const onchainLedger = isOnchainLedgerMode();

    const runPayment = onchainLedger
      ? appDb.transaction(() => {
          const payment = appDb.createPayment({
            senderUserId: auth.user.id,
            recipientUserId: invoice.creator_user_id,
            recipientPhone: null,
            recipientAddress: invoice.creator_address,
            tokenId: invoice.token_id,
            amountAtomic,
            note: `Invoice payment: ${invoice.id}`,
            status: "onchain_confirmed",
            aleoTxId,
          });
          appDb.markInvoicePaid(invoice.id, payment.id);
          return payment;
        })()
      : appDb.transaction(() => {
          const payerBalance = appDb.getBalanceAtomic(auth.user.id, invoice.token_id);
          if (payerBalance < amountAtomic) {
            throw new Error(`Insufficient ${invoice.token_id} balance`);
          }
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
