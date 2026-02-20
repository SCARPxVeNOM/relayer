import { getTokenById } from "../services/assets.catalog.js";

function validateAmountString(amount) {
  if (typeof amount !== "string" && typeof amount !== "number") {
    throw new Error("Amount must be a string or number");
  }
  const value = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Invalid amount format");
  }
  return value;
}

export function parseAmountToAtomic(amount, decimals) {
  const normalized = validateAmountString(amount);
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places. Max for this token is ${decimals}`);
  }
  const paddedFraction = fraction.padEnd(decimals, "0");
  const atomicStr = `${whole}${paddedFraction}`.replace(/^0+/, "") || "0";
  return BigInt(atomicStr);
}

export function formatAtomicToDecimal(atomic, decimals) {
  const n = BigInt(atomic);
  const negative = n < 0n;
  const abs = negative ? -n : n;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  const out = fractionStr ? `${whole.toString()}.${fractionStr}` : whole.toString();
  return negative ? `-${out}` : out;
}

export function formatBalanceRow(row) {
  const token = getTokenById(row.token_id);
  if (!token) {
    return {
      tokenId: row.token_id,
      amountAtomic: row.available_atomic,
      amount: row.available_atomic,
      decimals: 0,
      symbol: row.token_id,
    };
  }
  return {
    tokenId: token.id,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    standard: token.standard,
    amountAtomic: row.available_atomic,
    amount: formatAtomicToDecimal(row.available_atomic, token.decimals),
  };
}

