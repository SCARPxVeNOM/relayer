const ONCHAIN_LEDGER_MODE = ["1", "true", "yes"].includes(
  String(process.env.ENFORCE_ONCHAIN_LEDGER || "true").toLowerCase()
);

export function isOnchainLedgerMode() {
  return ONCHAIN_LEDGER_MODE;
}

