import crypto from "crypto";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("WalletAuthService");

const WALLET_AUTH_EXPIRY_MS = 5 * 60 * 1000;

function now() {
  return Date.now();
}

export function normalizeAleoAddress(value) {
  if (!value || typeof value !== "string") {
    throw new Error("Wallet address is required");
  }
  const address = value.trim();
  if (!/^aleo1[a-z0-9]{20,}$/i.test(address)) {
    throw new Error("Invalid Aleo wallet address");
  }
  return address;
}

export function createWalletAuthChallenge({ addressHint, domain }) {
  const challengeId = `wac_${crypto.randomUUID().replace(/-/g, "")}`;
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = now();
  const expiresAt = issuedAt + WALLET_AUTH_EXPIRY_MS;
  const safeDomain = (domain || "localhost").replace(/[^\w.\-:/]/g, "");
  const safeAddressHint = addressHint || "any";

  const message = [
    "Envelop Wallet Login",
    `challenge_id:${challengeId}`,
    `nonce:${nonce}`,
    `domain:${safeDomain}`,
    `address_hint:${safeAddressHint}`,
    `issued_at:${new Date(issuedAt).toISOString()}`,
    `expires_at:${new Date(expiresAt).toISOString()}`,
  ].join("\n");

  return {
    challengeId,
    nonce,
    message,
    issuedAt,
    expiresAt,
  };
}

function decodeBase64ToUtf8(input) {
  try {
    return Buffer.from(input, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function decodeHexToUtf8(input) {
  try {
    const clean = input.startsWith("0x") ? input.slice(2) : input;
    if (!/^[0-9a-f]+$/i.test(clean) || clean.length % 2 !== 0) {
      return null;
    }
    return Buffer.from(clean, "hex").toString("utf8");
  } catch {
    return null;
  }
}

function extractCandidateSignatures(signature, signatureBase64) {
  const candidates = [];
  const add = (value) => {
    if (!value || typeof value !== "string") return;
    const normalized = value.trim();
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
  };

  add(signature);
  add(decodeBase64ToUtf8(signature));
  add(decodeHexToUtf8(signature));
  add(decodeBase64ToUtf8(signatureBase64 || ""));
  add(decodeHexToUtf8(signatureBase64 || ""));

  return candidates;
}

function strictWalletAuth() {
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    return true;
  }
  const value = String(process.env.WALLET_AUTH_STRICT || "false").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function allowRuntimeRestrictedRelaxedMode() {
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    return false;
  }
  const value = String(process.env.WALLET_AUTH_ALLOW_RUNTIME_RELAXED || "true").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function isRuntimeRestrictionError(reason) {
  const message = String(reason || "").toLowerCase();
  const hints = ["eperm", "operation not permitted", "spawnsync"];
  return hints.some((hint) => message.includes(hint));
}

export async function verifyWalletSignature({
  address,
  message,
  signature,
  signatureBase64,
}) {
  const candidates = extractCandidateSignatures(signature, signatureBase64);
  const messageBytes = new TextEncoder().encode(message);

  let verified = false;
  let failureReason = "No valid Aleo signature format was provided";

  for (const candidate of candidates) {
    try {
      const sdk = await import("@provablehq/sdk");
      const addressObj = sdk.Address.from_string(address);
      const signatureObj = sdk.Signature.from_string(candidate);
      if (signatureObj.verify(addressObj, messageBytes)) {
        verified = true;
        failureReason = "";
        break;
      }
      failureReason = "Signature parsed but did not verify for provided address/message";
    } catch (error) {
      failureReason = error?.message || "Failed to parse Aleo signature";
    }
  }

  const runtimeRestricted = !verified && isRuntimeRestrictionError(failureReason);
  const strictMode = strictWalletAuth();
  const canRelaxForRuntime = runtimeRestricted && allowRuntimeRestrictedRelaxedMode();

  if (!verified && strictMode && !canRelaxForRuntime) {
    throw new Error(`Wallet signature verification failed: ${failureReason}`);
  }

  if (!verified) {
    logger.warn(
      canRelaxForRuntime
        ? "Wallet auth continuing in relaxed mode due runtime restrictions"
        : "Wallet auth continuing in relaxed mode",
      {
      address,
      reason: failureReason,
      candidatesTried: candidates.length,
      strictMode,
      runtimeRestricted,
      }
    );
  }

  return {
    verified,
    warning: !verified
      ? "Signature could not be strictly verified. Accepted in relaxed mode for onboarding."
      : undefined,
  };
}
