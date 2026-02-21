import {
  inferFeePayerAddress,
  listExecutionTransitions,
  requireConfirmedAleoTx,
} from "./aleo.tx.service.js";

const DEFAULT_IDENTITY_PROGRAM_ID =
  process.env.ALEO_IDENTITY_PROGRAM_ID || "envelop_identity_v2.aleo";
const DEFAULT_IDENTITY_REGISTER_FUNCTION =
  process.env.ALEO_IDENTITY_REGISTER_FUNCTION || "register_username";
const ALLOW_PRIVATE_INPUT_CLAIMS = ["1", "true", "yes"].includes(
  String(process.env.ALEO_IDENTITY_ALLOW_PRIVATE_INPUT_CLAIMS || "false").toLowerCase()
);
const ENFORCE_FEE_PAYER_MATCH = ["1", "true", "yes"].includes(
  String(process.env.ALEO_IDENTITY_ENFORCE_FEE_PAYER_MATCH || "false").toLowerCase()
);

function createStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeProgramOrFunction(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeUsername(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(normalized)) {
    throw createStatusError(
      "username must be 3-32 chars using lowercase letters, numbers, and underscore",
      400
    );
  }
  return normalized;
}

function normalizeDisplayName(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.length < 2 || normalized.length > 64) {
    throw createStatusError("displayName must be 2-64 characters", 400);
  }
  return normalized;
}

function normalizeAddressForMatch(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function pickOwnerAddress(payload) {
  const candidates = [
    payload?.owner?.address,
    payload?.owner,
    payload?.transaction?.owner?.address,
    payload?.transaction?.owner,
    payload?.execution?.owner?.address,
    payload?.execution?.owner,
    payload?.transaction?.execution?.owner?.address,
    payload?.transaction?.execution?.owner,
    payload?.fee?.owner?.address,
    payload?.fee?.owner,
    payload?.transaction?.fee?.owner?.address,
    payload?.transaction?.fee?.owner,
    payload?.from?.address,
    payload?.from,
    payload?.transaction?.from?.address,
    payload?.transaction?.from,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value.startsWith("aleo1")) {
      return value;
    }
  }
  return null;
}

function extractInputLiteral(input) {
  if (typeof input === "string") {
    return input.trim();
  }
  if (!input || typeof input !== "object") {
    return "";
  }

  const directCandidates = [input.value, input.literal, input.plaintext, input.text];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (input.value && typeof input.value === "object") {
    const nestedCandidates = [
      input.value.value,
      input.value.literal,
      input.value.plaintext,
      input.value.text,
    ];
    for (const candidate of nestedCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return "";
}

function isOpaquePrivateInput(input) {
  const type = String(input?.type || "")
    .trim()
    .toLowerCase();
  if (type !== "private") return false;
  const literal = extractInputLiteral(input);
  return literal.startsWith("ciphertext1");
}

function hashToField(input) {
  // Keep hash logic aligned with frontend identity input generation.
  let hash = 1469598103934665603n;
  const prime = 1099511628211n;
  const mod = 2n ** 64n;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) % mod;
  }
  return `${hash}field`;
}

function findTransition(payload, { programId, functionName }) {
  const normalizedProgram = normalizeProgramOrFunction(programId);
  const normalizedFunction = normalizeProgramOrFunction(functionName);
  const transitions = listExecutionTransitions(payload);
  return (
    transitions.find(
      (transition) =>
        normalizeProgramOrFunction(transition?.program) === normalizedProgram &&
        normalizeProgramOrFunction(transition?.function) === normalizedFunction
    ) || null
  );
}

export async function verifyUsernameClaimTransaction({
  txId,
  expectedWalletAddress,
  username,
  displayName,
  programId = DEFAULT_IDENTITY_PROGRAM_ID,
  functionName = DEFAULT_IDENTITY_REGISTER_FUNCTION,
}) {
  const normalizedTxId = String(txId || "").trim();
  if (!normalizedTxId) {
    throw createStatusError("usernameClaimTxId is required", 400);
  }

  const normalizedWalletAddress = String(expectedWalletAddress || "").trim();
  if (!normalizedWalletAddress) {
    throw createStatusError("Authenticated wallet address is required", 409);
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedDisplayName = normalizeDisplayName(displayName) || normalizedUsername;
  const expectedUsernameHash = hashToField(`user:${normalizedUsername}`);
  const expectedDisplayNameHash = hashToField(`name:${normalizedDisplayName}`);

  const confirmation = await requireConfirmedAleoTx(normalizedTxId);
  const payload = confirmation.raw || {};

  const claimTransition = findTransition(payload, { programId, functionName });
  if (!claimTransition) {
    throw createStatusError(
      `Aleo transaction must execute ${programId}/${functionName}`,
      422
    );
  }

  const transitionInputs = Array.isArray(claimTransition.inputs) ? claimTransition.inputs : [];
  const claimInputs = transitionInputs.map(extractInputLiteral);
  const hashInputsOpaquePrivate =
    transitionInputs.length < 2 ||
    isOpaquePrivateInput(transitionInputs[0]) ||
    isOpaquePrivateInput(transitionInputs[1]);

  if (hashInputsOpaquePrivate && !ALLOW_PRIVATE_INPUT_CLAIMS) {
    throw createStatusError(
      "Username claim transaction hash inputs are private and cannot be verified. Deploy/use identity program with public hash inputs.",
      422
    );
  }

  if (!hashInputsOpaquePrivate) {
    if (!claimInputs[0] || !claimInputs[1]) {
      throw createStatusError(
        "Unable to inspect username claim inputs from Aleo transaction",
        422
      );
    }
    if (claimInputs[0] !== expectedUsernameHash || claimInputs[1] !== expectedDisplayNameHash) {
      throw createStatusError(
        "Aleo username claim does not match requested username/displayName",
        409
      );
    }
  }

  const ownerAddress = pickOwnerAddress(payload);
  const feePayerAddress = inferFeePayerAddress(payload);
  const payerAddress = feePayerAddress || ownerAddress;
  if (!ownerAddress && !feePayerAddress) {
    throw createStatusError(
      "Unable to infer Aleo fee payer/owner address for username claim transaction",
      422
    );
  }

  const expectedWalletAddressNorm = normalizeAddressForMatch(normalizedWalletAddress);
  const ownerAddressNorm = normalizeAddressForMatch(ownerAddress);
  const feePayerAddressNorm = normalizeAddressForMatch(feePayerAddress);

  if (ownerAddress) {
    if (ownerAddressNorm !== expectedWalletAddressNorm) {
      throw createStatusError(
        `Aleo username claim transaction owner does not match authenticated wallet (expected ${normalizedWalletAddress}, got ${ownerAddress})`,
        403
      );
    }
  } else if (
    feePayerAddress &&
    feePayerAddressNorm !== expectedWalletAddressNorm &&
    ENFORCE_FEE_PAYER_MATCH
  ) {
    throw createStatusError(
      `Aleo username claim transaction was not paid by the authenticated wallet (expected ${normalizedWalletAddress}, got ${payerAddress})`,
      403
    );
  }

  return {
    txId: normalizedTxId,
    txState: confirmation.txState,
    rawStatus: confirmation.rawStatus,
    source: confirmation.source,
    programId,
    functionName,
    feePayerAddress: payerAddress,
    usernameHash: expectedUsernameHash,
    displayNameHash: expectedDisplayNameHash,
    hashVerification: hashInputsOpaquePrivate ? "private_hash_inputs_not_plaintext" : "verified",
  };
}
