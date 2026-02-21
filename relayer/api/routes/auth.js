import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { getOrCreateBoundWallet } from "../../services/wallet.binding.service.js";
import { normalizePhone, sendOtp, verifyOtp } from "../../services/otp.service.js";
import { hydrateUserIdentityFromClaim } from "../../services/identity.directory.service.js";
import {
  createWalletAuthChallenge,
  normalizeAleoAddress,
  verifyWalletSignature,
} from "../../services/wallet.auth.service.js";

const OTP_EXPIRY_MS = 5 * 60 * 1000;

function formatUserForResponse(user) {
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

export async function sendOtpCode(req, res) {
  try {
    const body = await readJsonBody(req);
    const phone = normalizePhone(body.phone);
    const otp = await sendOtp({ phone });
    const challengeId = appDb.createOtpChallenge({
      phone,
      provider: otp.provider,
      providerSid: otp.providerSid,
      codeHash: otp.codeHash,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      metadata: otp.metadata,
    });

    sendJson(res, 200, {
      success: true,
      challengeId,
      phone,
      channel: "whatsapp",
      provider: otp.provider,
      expiresInSec: Math.floor(OTP_EXPIRY_MS / 1000),
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function verifyOtpCode(req, res) {
  try {
    const body = await readJsonBody(req);
    const phone = normalizePhone(body.phone);
    const challengeId = body.challengeId;
    const code = String(body.code || "");
    const pin = String(body.pin || "");

    if (!challengeId) {
      return sendJson(res, 400, { success: false, error: "challengeId is required" });
    }

    const challenge = appDb.getOtpChallenge(challengeId);
    if (!challenge) {
      return sendJson(res, 404, { success: false, error: "OTP challenge not found" });
    }
    if (challenge.phone !== phone) {
      return sendJson(res, 400, { success: false, error: "Phone number does not match challenge" });
    }
    if (challenge.status !== "pending") {
      return sendJson(res, 400, { success: false, error: "OTP challenge already used" });
    }
    if (challenge.expires_at <= Date.now()) {
      return sendJson(res, 400, { success: false, error: "OTP challenge expired" });
    }
    if (challenge.attempts >= 5) {
      return sendJson(res, 429, { success: false, error: "Too many invalid attempts" });
    }

    const ok = await verifyOtp({ phone, challenge, code });
    if (!ok) {
      appDb.incrementOtpAttempt(challenge.id);
      return sendJson(res, 400, { success: false, error: "Invalid OTP code" });
    }

    appDb.markOtpChallengeVerified(challenge.id);
    const user = appDb.createOrGetUserByPhone(phone);
    const wallet = await getOrCreateBoundWallet(user.id, pin);
    const session = appDb.createAuthSession(user.id);

    const updatedUser = hydrateUserIdentityFromClaim(appDb.getUserById(user.id));

    sendJson(res, 200, {
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: formatUserForResponse(updatedUser),
      wallet: {
        address: wallet.address,
        createdNow: wallet.created,
      },
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

function requestDomain(req, body) {
  const explicit = body?.domain;
  if (explicit && typeof explicit === "string") {
    return explicit;
  }
  const origin = req.headers.origin;
  if (origin && typeof origin === "string") {
    return origin;
  }
  return req.headers.host || "localhost";
}

export async function createWalletChallenge(req, res) {
  try {
    const body = await readJsonBody(req);
    const addressHint = body?.address ? normalizeAleoAddress(body.address) : null;
    const challenge = createWalletAuthChallenge({
      addressHint,
      domain: requestDomain(req, body),
    });

    const challengeId = appDb.createWalletAuthChallenge({
      challengeId: challenge.challengeId,
      addressHint,
      message: challenge.message,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
    });

    sendJson(res, 200, {
      success: true,
      challengeId,
      message: challenge.message,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
      expiresInSec: Math.floor((challenge.expiresAt - Date.now()) / 1000),
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function verifyWalletChallenge(req, res) {
  try {
    const body = await readJsonBody(req);
    const challengeId = String(body.challengeId || "");
    const address = normalizeAleoAddress(body.address);
    const signature = body.signature ? String(body.signature) : "";
    const signatureBase64 = body.signatureBase64 ? String(body.signatureBase64) : "";

    if (!challengeId) {
      return sendJson(res, 400, { success: false, error: "challengeId is required" });
    }

    const challenge = appDb.getWalletAuthChallenge(challengeId);
    if (!challenge) {
      return sendJson(res, 404, { success: false, error: "Wallet challenge not found" });
    }
    if (challenge.status !== "pending") {
      return sendJson(res, 400, { success: false, error: "Wallet challenge already used" });
    }
    if (challenge.expires_at <= Date.now()) {
      return sendJson(res, 400, { success: false, error: "Wallet challenge expired" });
    }
    if (challenge.attempts >= 5) {
      return sendJson(res, 429, { success: false, error: "Too many invalid attempts" });
    }
    if (challenge.address_hint && challenge.address_hint !== address) {
      return sendJson(res, 400, {
        success: false,
        error: "Wallet address does not match challenge address hint",
      });
    }

    let verification;
    try {
      verification = await verifyWalletSignature({
        address,
        message: challenge.message,
        signature,
        signatureBase64,
      });
    } catch (error) {
      appDb.incrementWalletAuthAttempt(challenge.id);
      return sendJson(res, 400, {
        success: false,
        error: error.message || "Wallet signature verification failed",
      });
    }

    appDb.markWalletAuthChallengeVerified(challenge.id);

    const existed = !!appDb.getUserByAddress(address);
    const user = appDb.createOrGetUserByWalletAddress(address);
    const session = appDb.createAuthSession(user.id);
    const updatedUser = hydrateUserIdentityFromClaim(appDb.getUserById(user.id));

    sendJson(res, 200, {
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      authMethod: "wallet",
      signatureVerified: verification.verified,
      ...(verification.warning ? { warning: verification.warning } : {}),
      user: formatUserForResponse(updatedUser),
      wallet: {
        address,
        createdNow: !existed,
      },
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}
