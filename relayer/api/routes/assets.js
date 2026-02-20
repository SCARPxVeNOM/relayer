import appDb from "../../storage/app.db.js";
import { sendJson } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { SUPPORTED_TOKENS } from "../../services/assets.catalog.js";
import { formatBalanceRow } from "../../utils/amounts.js";

export async function getMe(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  sendJson(res, 200, {
    success: true,
    user: {
      id: auth.user.id,
      phone: auth.user.phone,
      walletAddress: auth.user.wallet_address,
    },
  });
}

export async function listSupportedTokens(req, res) {
  sendJson(res, 200, {
    success: true,
    tokens: SUPPORTED_TOKENS,
  });
}

export async function getBalances(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }
  appDb.ensureInitialBalances(auth.user.id);
  const balances = appDb.listBalances(auth.user.id).map(formatBalanceRow);
  sendJson(res, 200, {
    success: true,
    walletAddress: auth.user.wallet_address,
    balances,
  });
}

export async function getActivity(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  const swaps = appDb.listSwaps(auth.user.id, 20);
  const payments = appDb.listPayments(auth.user.id, 20);
  const invoices = appDb.listInvoicesForUser(auth.user).slice(0, 20);

  sendJson(res, 200, {
    success: true,
    activity: {
      swaps,
      payments,
      invoices,
    },
  });
}

