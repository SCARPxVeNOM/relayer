import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { SUPPORTED_TOKENS } from "../../services/assets.catalog.js";
import { formatBalanceRow } from "../../utils/amounts.js";
import { verifyUsernameClaimTransaction } from "../../services/identity.claim.service.js";
import { hydrateUserIdentityFromClaim } from "../../services/identity.directory.service.js";
import { isOnchainLedgerMode } from "../../services/onchain.mode.service.js";

function formatUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    walletAddress: user.wallet_address,
    username: user.username || null,
    displayName: user.display_name || null,
    usernameClaimTxId: user.username_claim_tx_id || null,
    usernameClaimedAt: user.username_claimed_at || null,
  };
}

export async function getMe(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  const hydratedUser = hydrateUserIdentityFromClaim(auth.user);

  sendJson(res, 200, {
    success: true,
    user: formatUser(hydratedUser),
  });
}

export async function updateMyProfile(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || "");
    const displayName = String(body.displayName || "");
    const usernameClaimTxId = String(body.usernameClaimTxId || "").trim();

    const currentUser = hydrateUserIdentityFromClaim(auth.user);
    if (currentUser.username) {
      const normalizedRequestedUsername = String(username || "")
        .trim()
        .toLowerCase();
      if (normalizedRequestedUsername && normalizedRequestedUsername !== String(currentUser.username)) {
        return sendJson(res, 409, {
          success: false,
          error: "Username is already registered and cannot be changed",
        });
      }

      const existingClaim = appDb.getIdentityClaimByUsername(currentUser.username);
      if (!existingClaim && usernameClaimTxId) {
        const claim = await verifyUsernameClaimTransaction({
          txId: usernameClaimTxId,
          expectedWalletAddress: auth.user.wallet_address,
          username: currentUser.username,
          displayName: displayName || currentUser.display_name || currentUser.username,
        });
        appDb.upsertIdentityClaim({
          username: currentUser.username,
          usernameHash: claim.usernameHash,
          displayNameHash: claim.displayNameHash,
          displayName: displayName || currentUser.display_name || currentUser.username,
          walletAddress: auth.user.wallet_address,
          claimTxId: claim.txId,
          programId: claim.programId,
          functionName: claim.functionName,
          claimedAt: Date.now(),
        });
      }

      const updatedUser = appDb.upsertUserProfile(auth.user.id, {
        username: currentUser.username,
        displayName,
        usernameClaimTxId: currentUser.username_claim_tx_id || currentUser.usernameClaimTxId || "preserved",
      });
      return sendJson(res, 200, {
        success: true,
        user: formatUser(updatedUser),
        claim: null,
      });
    }

    if (!usernameClaimTxId) {
      return sendJson(res, 400, {
        success: false,
        error: "usernameClaimTxId is required for first-time username registration",
      });
    }

    const claim = await verifyUsernameClaimTransaction({
      txId: usernameClaimTxId,
      expectedWalletAddress: auth.user.wallet_address,
      username,
      displayName,
    });

    appDb.upsertIdentityClaim({
      username,
      usernameHash: claim.usernameHash,
      displayNameHash: claim.displayNameHash,
      displayName,
      walletAddress: auth.user.wallet_address,
      claimTxId: claim.txId,
      programId: claim.programId,
      functionName: claim.functionName,
      claimedAt: Date.now(),
    });

    const updatedUser = appDb.upsertUserProfile(auth.user.id, {
      username,
      displayName,
      usernameClaimTxId,
    });

    sendJson(res, 200, {
      success: true,
      user: formatUser(updatedUser),
      claim: {
        txId: claim.txId,
        programId: claim.programId,
        functionName: claim.functionName,
        feePayerAddress: claim.feePayerAddress,
      },
    });
  } catch (error) {
    sendJson(res, error?.statusCode || 400, {
      success: false,
      error: error.message,
    });
  }
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
  const balances = appDb.listBalances(auth.user.id).map(formatBalanceRow);
  const onchainLedger = isOnchainLedgerMode();
  sendJson(res, 200, {
    success: true,
    walletAddress: auth.user.wallet_address,
    balances,
    ledgerMode: onchainLedger ? "onchain_canonical" : "backend_simulated",
    note: onchainLedger
      ? "On-chain settlement is active. Displayed balances can update with a short indexing delay."
      : undefined,
  });
}

export async function getActivity(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  const swaps = appDb.listSwaps(auth.user.id, 20);
  const payments = appDb.listPayments(auth.user, 20);
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
