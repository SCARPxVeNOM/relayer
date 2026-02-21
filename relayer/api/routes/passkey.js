import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { getOrCreateBoundWallet } from "../../services/wallet.binding.service.js";
import { fromBase64Url, toBase64Url } from "../../utils/base64url.js";
import { hydrateUserIdentityFromClaim } from "../../services/identity.directory.service.js";

const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function getPasskeySdk() {
  try {
    return await import("@simplewebauthn/server");
  } catch {
    throw new Error(
      "Passkey support is not installed. Add @simplewebauthn/server to backend dependencies."
    );
  }
}

function normalizePasskeyUsername(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(normalized)) {
    throw new Error("username must be 3-64 chars using a-z, 0-9, dot, underscore, hyphen");
  }
  return normalized;
}

function getRpId(req, body) {
  if (process.env.PASSKEY_RP_ID) return process.env.PASSKEY_RP_ID;
  const explicit = body?.rpId ? String(body.rpId).trim() : "";
  if (explicit) return explicit;
  const host = String(req.headers.host || "localhost");
  return host.split(":")[0];
}

function getExpectedOrigins(req, body) {
  if (process.env.PASSKEY_EXPECTED_ORIGINS) {
    return process.env.PASSKEY_EXPECTED_ORIGINS.split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  const explicit = body?.origin ? String(body.origin).trim() : "";
  if (explicit) return [explicit];
  const headerOrigin = req.headers.origin ? String(req.headers.origin).trim() : "";
  if (headerOrigin) return [headerOrigin];
  return [`http://${String(req.headers.host || "localhost")}`];
}

function parseTransports(transports) {
  if (!Array.isArray(transports)) return [];
  return transports.map((t) => String(t)).filter(Boolean);
}

function normalizeCredentialId(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return trimmed;
    }
    return toBase64Url(Buffer.from(trimmed, "base64"));
  }
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return toBase64Url(value);
  }
  if (Array.isArray(value)) {
    return toBase64Url(Buffer.from(value));
  }
  return "";
}

function ensurePendingChallenge(challenge, purpose) {
  if (!challenge) {
    throw new Error("Passkey challenge not found");
  }
  if (challenge.purpose !== purpose) {
    throw new Error("Passkey challenge purpose mismatch");
  }
  if (challenge.status !== "pending") {
    throw new Error("Passkey challenge already used");
  }
  if (challenge.expires_at <= Date.now()) {
    throw new Error("Passkey challenge expired");
  }
}

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

export async function createPasskeyRegistrationOptions(req, res) {
  try {
    const body = await readJsonBody(req);
    const username = normalizePasskeyUsername(body.username);
    const displayName = String(body.displayName || username).trim();
    const user = appDb.createOrGetUserByPasskeyUsername(username);
    const sdk = await getPasskeySdk();
    const rpID = getRpId(req, body);
    const existingCredentials = appDb.listPasskeyCredentialsByUserId(user.id).map((row) => ({
      id: row.credential_id,
      type: "public-key",
      transports: parseTransports(JSON.parse(row.transports_json || "[]")),
    }));

    const options = await sdk.generateRegistrationOptions({
      rpName: process.env.PASSKEY_RP_NAME || "Envelop Private Finance",
      rpID,
      userID: String(user.id),
      userName: username,
      userDisplayName: displayName,
      timeout: 60_000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: existingCredentials,
    });

    const challengeId = appDb.createPasskeyChallenge({
      userId: user.id,
      username,
      purpose: "register",
      challenge: options.challenge,
      expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
    });

    sendJson(res, 200, {
      success: true,
      challengeId,
      options,
      username,
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function verifyPasskeyRegistration(req, res) {
  try {
    const body = await readJsonBody(req);
    const challengeId = String(body.challengeId || "").trim();
    const username = normalizePasskeyUsername(body.username);
    const pin = String(body.pin || "");
    const credential = body.credential;
    if (!challengeId) {
      return sendJson(res, 400, { success: false, error: "challengeId is required" });
    }
    if (!credential || typeof credential !== "object") {
      return sendJson(res, 400, { success: false, error: "credential is required" });
    }
    if (pin.length < 4) {
      return sendJson(res, 400, { success: false, error: "PIN must be at least 4 characters" });
    }

    const challenge = appDb.getPasskeyChallenge(challengeId);
    ensurePendingChallenge(challenge, "register");
    if (challenge.username && challenge.username !== username) {
      return sendJson(res, 400, { success: false, error: "username does not match challenge" });
    }

    const user = challenge.user_id
      ? appDb.getUserById(challenge.user_id)
      : appDb.getUserByPasskeyUsername(username);
    if (!user) {
      return sendJson(res, 404, { success: false, error: "User not found for passkey registration" });
    }

    const sdk = await getPasskeySdk();
    const verification = await sdk.verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(req, body),
      expectedRPID: getRpId(req, body),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return sendJson(res, 400, { success: false, error: "Passkey registration verification failed" });
    }

    const info = verification.registrationInfo;
    const cred = info.credential || {};
    const credentialId =
      normalizeCredentialId(cred.id) || normalizeCredentialId(info.credentialID) || normalizeCredentialId(credential.id);
    const publicKey =
      cred.publicKey || info.credentialPublicKey || info.publicKey || null;
    const counter = cred.counter ?? info.counter ?? 0;
    const transports = parseTransports(cred.transports || credential.response?.transports || []);
    const backedUp = Boolean(info.credentialBackedUp ?? false);

    if (!credentialId || !publicKey) {
      return sendJson(res, 400, {
        success: false,
        error: "Passkey credential payload missing id/public key",
      });
    }

    appDb.createOrUpdatePasskeyCredential({
      userId: user.id,
      username,
      credentialId,
      publicKeyB64: Buffer.from(publicKey).toString("base64"),
      counter,
      transportsJson: JSON.stringify(transports),
      backedUp,
    });
    appDb.markPasskeyChallengeUsed(challenge.id);

    const wallet = await getOrCreateBoundWallet(user.id, pin);
    const session = appDb.createAuthSession(user.id);
    const updatedUser = hydrateUserIdentityFromClaim(appDb.getUserById(user.id));

    sendJson(res, 200, {
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      authMethod: "passkey",
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

export async function createPasskeyLoginOptions(req, res) {
  try {
    const body = await readJsonBody(req);
    const username = body.username ? normalizePasskeyUsername(body.username) : null;
    const user = username ? appDb.getUserByPasskeyUsername(username) : null;
    if (username && !user) {
      return sendJson(res, 404, { success: false, error: "Passkey user not found" });
    }

    const allowCredentials =
      user?.id != null
        ? appDb.listPasskeyCredentialsByUserId(user.id).map((row) => ({
            id: row.credential_id,
            type: "public-key",
            transports: parseTransports(JSON.parse(row.transports_json || "[]")),
          }))
        : [];

    const sdk = await getPasskeySdk();
    const options = await sdk.generateAuthenticationOptions({
      rpID: getRpId(req, body),
      timeout: 60_000,
      userVerification: "preferred",
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
    });

    const challengeId = appDb.createPasskeyChallenge({
      userId: user?.id || null,
      username,
      purpose: "login",
      challenge: options.challenge,
      expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
    });

    sendJson(res, 200, {
      success: true,
      challengeId,
      options,
      username,
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function verifyPasskeyLogin(req, res) {
  try {
    const body = await readJsonBody(req);
    const challengeId = String(body.challengeId || "").trim();
    const credential = body.credential;
    if (!challengeId) {
      return sendJson(res, 400, { success: false, error: "challengeId is required" });
    }
    if (!credential || typeof credential !== "object") {
      return sendJson(res, 400, { success: false, error: "credential is required" });
    }

    const challenge = appDb.getPasskeyChallenge(challengeId);
    ensurePendingChallenge(challenge, "login");
    if (challenge.username && body.username) {
      const normalized = normalizePasskeyUsername(body.username);
      if (normalized !== challenge.username) {
        return sendJson(res, 400, { success: false, error: "username does not match challenge" });
      }
    }

    const credentialId =
      normalizeCredentialId(credential.id) ||
      normalizeCredentialId(credential.rawId) ||
      normalizeCredentialId(credential?.response?.id);
    if (!credentialId) {
      return sendJson(res, 400, { success: false, error: "credential id is missing" });
    }

    const stored = appDb.getPasskeyCredentialByCredentialId(credentialId);
    if (!stored) {
      return sendJson(res, 404, { success: false, error: "Unknown passkey credential" });
    }
    if (challenge.user_id && stored.user_id !== challenge.user_id) {
      return sendJson(res, 403, { success: false, error: "Credential does not match challenge user" });
    }

    const user = appDb.getUserById(stored.user_id);
    if (!user) {
      return sendJson(res, 404, { success: false, error: "User not found for credential" });
    }

    const sdk = await getPasskeySdk();
    const authenticator = {
      credentialID: fromBase64Url(stored.credential_id),
      credentialPublicKey: Buffer.from(stored.public_key_b64, "base64"),
      counter: Number(stored.counter || 0),
      transports: parseTransports(JSON.parse(stored.transports_json || "[]")),
    };

    const verification = await sdk.verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(req, body),
      expectedRPID: getRpId(req, body),
      authenticator,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return sendJson(res, 400, { success: false, error: "Passkey login verification failed" });
    }

    appDb.updatePasskeyCredentialCounter(
      stored.credential_id,
      verification.authenticationInfo.newCounter,
      Boolean(verification.authenticationInfo.credentialBackedUp ?? stored.backed_up)
    );
    appDb.markPasskeyChallengeUsed(challenge.id);

    const session = appDb.createAuthSession(user.id);
    const updatedUser = hydrateUserIdentityFromClaim(appDb.getUserById(user.id));

    sendJson(res, 200, {
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      authMethod: "passkey",
      user: formatUserForResponse(updatedUser),
      wallet: {
        address: updatedUser.wallet_address,
        createdNow: false,
      },
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}
