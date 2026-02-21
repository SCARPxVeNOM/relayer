const DEFAULT_STATUS_CANDIDATES = (txId) => [
  `https://api.explorer.provable.com/v2/testnet/transaction/${txId}`,
  `https://api.explorer.provable.com/v1/testnet/transaction/${txId}`,
];

const STATUS_FETCH_TIMEOUT_MS = Number.parseInt(
  process.env.ALEO_TX_STATUS_TIMEOUT_MS || "10000",
  10
);

const ALEO_ADDRESS_REGEX = /aleo1[0-9a-z]{20,}/gi;

function normalizeState(rawStatus) {
  const status = String(rawStatus || "").toLowerCase();

  const failedHints = ["fail", "reject", "invalid", "drop", "error", "revert", "abort"];
  if (failedHints.some((hint) => status.includes(hint))) {
    return "failed";
  }

  const confirmedHints = [
    "confirm",
    "final",
    "success",
    "complete",
    "accept",
    "execut",
    "deploy",
    "includ",
    "commit",
  ];
  if (confirmedHints.some((hint) => status.includes(hint))) {
    return "confirmed";
  }

  const pendingHints = [
    "pending",
    "queue",
    "process",
    "broadcast",
    "submit",
    "mempool",
    "not_found",
  ];
  if (pendingHints.some((hint) => status.includes(hint))) {
    return "pending";
  }

  return "unknown";
}

function pickStatus(payload) {
  return (
    payload?.status ||
    payload?.type ||
    payload?.state ||
    payload?.transaction?.status ||
    payload?.transaction?.type ||
    payload?.transaction?.state ||
    "unknown"
  );
}

function buildStatusCandidates(txId) {
  const explicit = process.env.ALEO_RELAY_STATUS_URL
    ? process.env.ALEO_RELAY_STATUS_URL.replace(/\/+$/, "")
    : null;
  const candidates = explicit ? [`${explicit}/${txId}`] : [];
  return [...candidates, ...DEFAULT_STATUS_CANDIDATES(txId)];
}

function normalizeAleoTxId(txId) {
  if (!txId || typeof txId !== "string" || !txId.startsWith("at1")) {
    throw new AleoTxConfirmationError("Invalid Aleo transaction ID", {
      txId,
      txState: "invalid",
      rawStatus: "invalid",
      source: null,
      statusCode: 400,
    });
  }
  return txId;
}

export class AleoTxConfirmationError extends Error {
  constructor(message, { txId, txState, rawStatus, source, statusCode }) {
    super(message);
    this.name = "AleoTxConfirmationError";
    this.txId = txId;
    this.txState = txState;
    this.rawStatus = rawStatus;
    this.source = source;
    this.statusCode = statusCode;
  }
}

async function fetchTxPayload(txId) {
  const normalizedTxId = normalizeAleoTxId(txId);
  const candidates = buildStatusCandidates(normalizedTxId);
  let lastError = null;
  let notFoundSeen = false;
  let lastSource = null;

  for (const source of candidates) {
    lastSource = source;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STATUS_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(source, {
        method: "GET",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          payload?.message || payload?.error || `${response.status} ${response.statusText}`;
        lastError = message;
        if (
          response.status === 404 &&
          String(message || "")
            .toLowerCase()
            .includes("not found")
        ) {
          notFoundSeen = true;
        }
        continue;
      }
      return {
        txId: normalizedTxId,
        payload,
        source,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        lastError = `Status fetch timed out after ${STATUS_FETCH_TIMEOUT_MS}ms`;
      } else {
        lastError = error?.message || "Status fetch failed";
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (notFoundSeen) {
    throw new AleoTxConfirmationError(
      "Transaction is not indexed on explorer yet. Retry in a few seconds.",
      {
        txId: normalizedTxId,
        txState: "pending",
        rawStatus: "not_found",
        source: lastSource,
        statusCode: 409,
      }
    );
  }

  throw new AleoTxConfirmationError(lastError || "Unable to fetch Aleo transaction status", {
    txId: normalizedTxId,
    txState: "unknown",
    rawStatus: "unknown",
    source: lastSource,
    statusCode: 502,
  });
}

export async function fetchAleoTxDetails(txId) {
  return fetchTxPayload(txId);
}

export async function fetchAleoTxStatus(txId) {
  const detail = await fetchTxPayload(txId);
  const rawStatus = String(pickStatus(detail.payload));
  const txState = normalizeState(rawStatus);
  return {
    txId: detail.txId,
    txState,
    rawStatus,
    source: detail.source,
    raw: detail.payload,
  };
}

export function listExecutionTransitions(payload) {
  if (Array.isArray(payload?.execution?.transitions)) {
    return payload.execution.transitions;
  }
  if (Array.isArray(payload?.transaction?.execution?.transitions)) {
    return payload.transaction.execution.transitions;
  }
  return [];
}

export function hasExecutionTransition(payload, { programId, functionName }) {
  const transitions = listExecutionTransitions(payload);
  return transitions.some(
    (transition) =>
      String(transition?.program || "").toLowerCase() === String(programId || "").toLowerCase() &&
      String(transition?.function || "").toLowerCase() === String(functionName || "").toLowerCase()
  );
}

function findExecutionTransition(payload, { programId, functionName }) {
  const normalizedProgram = String(programId || "").toLowerCase();
  const normalizedFunction = String(functionName || "").toLowerCase();
  const transitions = listExecutionTransitions(payload);
  return (
    transitions.find(
      (transition) =>
        String(transition?.program || "").toLowerCase() === normalizedProgram &&
        String(transition?.function || "").toLowerCase() === normalizedFunction
    ) || null
  );
}

export function inferFeePayerAddress(payload) {
  const outputs =
    payload?.fee?.transition?.outputs || payload?.transaction?.fee?.transition?.outputs || [];
  for (const output of outputs) {
    if (typeof output?.value !== "string") continue;
    const match = output.value.match(ALEO_ADDRESS_REGEX);
    if (match && match[0]) {
      return match[0];
    }
  }

  const owner = payload?.owner?.address || payload?.transaction?.owner?.address;
  if (typeof owner === "string" && owner.startsWith("aleo1")) {
    return owner;
  }
  return null;
}

export function inferOwnerAddress(payload) {
  const candidates = [
    payload?.owner?.address,
    payload?.owner,
    payload?.transaction?.owner?.address,
    payload?.transaction?.owner,
    payload?.execution?.owner?.address,
    payload?.execution?.owner,
    payload?.transaction?.execution?.owner?.address,
    payload?.transaction?.execution?.owner,
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

function normalizeAddress(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export async function requireConfirmedAleoTransition(
  txId,
  {
    programId,
    functionName,
    expectedOwnerAddress,
    allowOwnerMismatch = false,
    enforceFeePayerMatch = false,
  } = {}
) {
  const status = await requireConfirmedAleoTx(txId);
  const payload = status.raw || {};

  if (programId && functionName) {
    const matched = hasExecutionTransition(payload, { programId, functionName });
    if (!matched) {
      throw new AleoTxConfirmationError(
        `Confirmed tx does not execute required transition ${programId}/${functionName}.`,
        {
          txId,
          txState: status.txState,
          rawStatus: status.rawStatus,
          source: status.source,
          statusCode: 422,
        }
      );
    }
  }

  if (expectedOwnerAddress && !allowOwnerMismatch) {
    const ownerAddress = inferOwnerAddress(payload);
    if (ownerAddress) {
      if (normalizeAddress(ownerAddress) !== normalizeAddress(expectedOwnerAddress)) {
        throw new AleoTxConfirmationError(
          `Confirmed tx owner does not match authenticated wallet (expected ${expectedOwnerAddress}, got ${ownerAddress}).`,
          {
            txId,
            txState: status.txState,
            rawStatus: status.rawStatus,
            source: status.source,
            statusCode: 403,
          }
        );
      }
    } else if (enforceFeePayerMatch) {
      const feePayerAddress = inferFeePayerAddress(payload);
      if (
        !feePayerAddress ||
        normalizeAddress(feePayerAddress) !== normalizeAddress(expectedOwnerAddress)
      ) {
        throw new AleoTxConfirmationError(
          `Confirmed tx fee payer does not match authenticated wallet (expected ${expectedOwnerAddress}, got ${feePayerAddress || "unknown"}).`,
          {
            txId,
            txState: status.txState,
            rawStatus: status.rawStatus,
            source: status.source,
            statusCode: 403,
          }
        );
      }
    }
  }

  return status;
}

function normalizeTransitionCandidates(transitions) {
  if (!Array.isArray(transitions)) return [];
  return transitions
    .map((candidate) => ({
      programId: String(candidate?.programId || "").trim(),
      functionName: String(candidate?.functionName || "").trim(),
    }))
    .filter((candidate) => candidate.programId && candidate.functionName);
}

export async function requireConfirmedAleoTransitionAny(
  txId,
  {
    transitions = [],
    expectedOwnerAddress,
    allowOwnerMismatch = false,
    enforceFeePayerMatch = false,
  } = {}
) {
  const candidates = normalizeTransitionCandidates(transitions);
  if (candidates.length === 0) {
    throw new AleoTxConfirmationError("No Aleo transition candidates configured for this action.", {
      txId,
      txState: "invalid",
      rawStatus: "invalid",
      source: null,
      statusCode: 500,
    });
  }

  const status = await requireConfirmedAleoTransition(txId, {
    expectedOwnerAddress,
    allowOwnerMismatch,
    enforceFeePayerMatch,
  });
  const payload = status.raw || {};
  const matchedCandidate =
    candidates.find((candidate) =>
      findExecutionTransition(payload, {
        programId: candidate.programId,
        functionName: candidate.functionName,
      })
    ) || null;

  if (!matchedCandidate) {
    const expected = candidates.map((c) => `${c.programId}/${c.functionName}`).join(", ");
    throw new AleoTxConfirmationError(
      `Confirmed tx does not execute any required transition for this action (${expected}).`,
      {
        txId,
        txState: status.txState,
        rawStatus: status.rawStatus,
        source: status.source,
        statusCode: 422,
      }
    );
  }

  return {
    ...status,
    matchedTransition: matchedCandidate,
  };
}

export async function requireConfirmedAleoTx(txId) {
  const status = await fetchAleoTxStatus(txId);
  if (status.txState === "confirmed") {
    return status;
  }

  if (status.txState === "pending" || status.txState === "unknown") {
    throw new AleoTxConfirmationError(
      "Transaction is not yet confirmed on Aleo testnet. Retry once status is confirmed.",
      {
        txId,
        txState: status.txState,
        rawStatus: status.rawStatus,
        source: status.source,
        statusCode: 409,
      }
    );
  }

  throw new AleoTxConfirmationError("Transaction failed on Aleo testnet and cannot be settled.", {
    txId,
    txState: status.txState,
    rawStatus: status.rawStatus,
    source: status.source,
    statusCode: 422,
  });
}
