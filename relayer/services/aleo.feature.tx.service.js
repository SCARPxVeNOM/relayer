import {
  requireConfirmedAleoTransition,
  requireConfirmedAleoTransitionAny,
} from "./aleo.tx.service.js";

function parseBoolean(value, fallback = false) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseCsvList(value, fallback) {
  const raw = String(value || "").trim();
  if (!raw) return [...fallback];
  const items = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return items.length > 0 ? Array.from(new Set(items)) : [...fallback];
}

function normalizeProgramId(value, fallback) {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function buildCandidates(programId, functionNames) {
  return functionNames.map((functionName) => ({
    programId,
    functionName,
  }));
}

function createStatusError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const ENFORCE_FEE_PAYER_MATCH = parseBoolean(process.env.ALEO_TX_ENFORCE_FEE_PAYER_MATCH, false);

const SWAP_PROGRAM_ID = normalizeProgramId(process.env.ALEO_SWAP_PROGRAM_ID, "envelop_swap.aleo");
const SWAP_ALLOWED_FUNCTIONS = parseCsvList(process.env.ALEO_SWAP_ALLOWED_FUNCTIONS, [
  "create_swap_request",
  "settle_swap",
  "settle_swap_onchain",
]);

const PAYMENTS_PROGRAM_ID = normalizeProgramId(
  process.env.ALEO_PAYMENTS_PROGRAM_ID,
  "envelop_payments.aleo"
);
const PAYMENTS_ALLOWED_FUNCTIONS = parseCsvList(process.env.ALEO_PAYMENTS_ALLOWED_FUNCTIONS, [
  "create_payment_intent",
  "settle_payment",
  "settle_payment_onchain",
]);

const INVOICE_PROGRAM_ID = normalizeProgramId(
  process.env.ALEO_INVOICE_PROGRAM_ID,
  "envelop_invoice.aleo"
);
const INVOICE_CREATE_ALLOWED_FUNCTIONS = parseCsvList(
  process.env.ALEO_INVOICE_CREATE_ALLOWED_FUNCTIONS,
  ["create_invoice"]
);
const INVOICE_PAY_ALLOWED_FUNCTIONS = parseCsvList(
  process.env.ALEO_INVOICE_PAY_ALLOWED_FUNCTIONS,
  ["pay_invoice", "pay_invoice_onchain"]
);

const YIELD_PROGRAM_ID = normalizeProgramId(process.env.ALEO_YIELD_PROGRAM_ID, "envelop_yield.aleo");
const YIELD_ALLOWED_FUNCTIONS = parseCsvList(process.env.ALEO_YIELD_ALLOWED_FUNCTIONS, [
  "stake",
  "stake_onchain",
  "unstake",
  "unstake_onchain",
  "claim",
  "claim_onchain",
  "rebalance",
  "rebalance_onchain",
]);

export function getAleoFeatureTxPolicy() {
  return {
    enforceFeePayerMatch: ENFORCE_FEE_PAYER_MATCH,
    swap: {
      programId: SWAP_PROGRAM_ID,
      allowedFunctions: [...SWAP_ALLOWED_FUNCTIONS],
    },
    payments: {
      programId: PAYMENTS_PROGRAM_ID,
      allowedFunctions: [...PAYMENTS_ALLOWED_FUNCTIONS],
    },
    invoices: {
      programId: INVOICE_PROGRAM_ID,
      createAllowedFunctions: [...INVOICE_CREATE_ALLOWED_FUNCTIONS],
      payAllowedFunctions: [...INVOICE_PAY_ALLOWED_FUNCTIONS],
    },
    yield: {
      programId: YIELD_PROGRAM_ID,
      allowedFunctions: [...YIELD_ALLOWED_FUNCTIONS],
    },
  };
}

export async function verifySwapExecutionTx({ txId, walletAddress }) {
  return requireConfirmedAleoTransitionAny(txId, {
    transitions: buildCandidates(SWAP_PROGRAM_ID, SWAP_ALLOWED_FUNCTIONS),
    expectedOwnerAddress: walletAddress,
    enforceFeePayerMatch: ENFORCE_FEE_PAYER_MATCH,
  });
}

export async function verifyPaymentSettlementTx({ txId, walletAddress }) {
  return requireConfirmedAleoTransitionAny(txId, {
    transitions: buildCandidates(PAYMENTS_PROGRAM_ID, PAYMENTS_ALLOWED_FUNCTIONS),
    expectedOwnerAddress: walletAddress,
    enforceFeePayerMatch: ENFORCE_FEE_PAYER_MATCH,
  });
}

export async function verifyInvoiceCreateTx({ txId, walletAddress }) {
  return requireConfirmedAleoTransitionAny(txId, {
    transitions: buildCandidates(INVOICE_PROGRAM_ID, INVOICE_CREATE_ALLOWED_FUNCTIONS),
    expectedOwnerAddress: walletAddress,
    enforceFeePayerMatch: ENFORCE_FEE_PAYER_MATCH,
  });
}

export async function verifyInvoicePayTx({ txId, walletAddress }) {
  return requireConfirmedAleoTransitionAny(txId, {
    transitions: buildCandidates(INVOICE_PROGRAM_ID, INVOICE_PAY_ALLOWED_FUNCTIONS),
    expectedOwnerAddress: walletAddress,
    enforceFeePayerMatch: ENFORCE_FEE_PAYER_MATCH,
  });
}

export function assertYieldTransitionAllowed({ programId, functionName }) {
  const normalizedProgramId = String(programId || "").trim();
  const normalizedFunctionName = String(functionName || "")
    .trim()
    .toLowerCase();
  if (!normalizedProgramId || !normalizedFunctionName) {
    throw createStatusError("Yield transition is missing program/function", 400);
  }
  if (normalizedProgramId.toLowerCase() !== YIELD_PROGRAM_ID.toLowerCase()) {
    throw createStatusError(
      `Yield transition program must be ${YIELD_PROGRAM_ID} (got ${normalizedProgramId})`,
      422
    );
  }
  if (!YIELD_ALLOWED_FUNCTIONS.includes(normalizedFunctionName)) {
    throw createStatusError(
      `Yield transition function ${functionName} is not allowed by backend policy`,
      422
    );
  }
}

export async function verifyYieldTransitionTx({
  txId,
  walletAddress,
  programId,
  functionName,
}) {
  assertYieldTransitionAllowed({ programId, functionName });
  return requireConfirmedAleoTransition(txId, {
    programId,
    functionName,
    expectedOwnerAddress: walletAddress,
    enforceFeePayerMatch: ENFORCE_FEE_PAYER_MATCH,
  });
}
