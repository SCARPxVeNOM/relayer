import appDb from "../storage/app.db.js";

const REQUIRE_ONCHAIN_RECIPIENT = ["1", "true", "yes"].includes(
  String(process.env.IDENTITY_REQUIRE_ONCHAIN_RECIPIENT || "true").toLowerCase()
);

function normalizeUsername(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(normalized)) {
    throw new Error("username must be 3-32 chars using lowercase letters, numbers, and underscore");
  }
  return normalized;
}

export function resolveUsernameToWallet(rawUsername, opts = {}) {
  const normalizedUsername = normalizeUsername(rawUsername);
  const allowLegacyFallback =
    typeof opts.allowLegacyFallback === "boolean"
      ? opts.allowLegacyFallback
      : !REQUIRE_ONCHAIN_RECIPIENT;

  const claim = appDb.getIdentityClaimByUsername(normalizedUsername);
  if (claim?.wallet_address) {
    const userByAddress = appDb.getUserByAddress(claim.wallet_address);
    return {
      username: normalizedUsername,
      walletAddress: claim.wallet_address,
      displayName: userByAddress?.display_name || claim.display_name || null,
      userId: userByAddress?.id || null,
      source: "onchain_claim",
      claimTxId: claim.claim_tx_id,
    };
  }

  if (!allowLegacyFallback) {
    return null;
  }

  const legacyUser = appDb.getUserByUsername(normalizedUsername);
  if (!legacyUser?.wallet_address) {
    return null;
  }

  return {
    username: normalizedUsername,
    walletAddress: legacyUser.wallet_address,
    displayName: legacyUser.display_name || null,
    userId: legacyUser.id,
    source: "legacy_user_db",
    claimTxId: legacyUser.username_claim_tx_id || null,
  };
}

export function hydrateUserIdentityFromClaim(user) {
  if (!user || user.username || !user.wallet_address) {
    return user;
  }
  const claim = appDb.getIdentityClaimByWalletAddress(user.wallet_address);
  if (!claim) {
    return user;
  }
  try {
    return appDb.upsertUserProfile(user.id, {
      username: claim.username,
      displayName: claim.display_name || claim.username,
      usernameClaimTxId: claim.claim_tx_id,
    });
  } catch {
    return user;
  }
}

