"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Menu, X } from "lucide-react";
import {
  DecryptPermission,
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  apiClient,
  BalanceItem,
  TokenMetadata,
  YieldAsset,
  YieldHistoryAction,
  YieldQuote,
  YieldTransition,
} from "@/services/api.client";
import { useAppAuthStore } from "@/stores/app-auth.store";

type LoadState = "idle" | "loading" | "ready" | "error";
type TxStatus = "pending" | "confirmed" | "failed";
type WorkspaceModule =
  | "overview"
  | "portfolio"
  | "swap"
  | "yield"
  | "payments"
  | "invoices"
  | "history"
  | "relay";

type RelayStatusSnapshot = {
  state: TxStatus;
  raw: string;
  updatedAt: number;
};

const SWAP_PROGRAM_ID = process.env.NEXT_PUBLIC_ALEO_SWAP_PROGRAM_ID || "envelop_swap.aleo";
const INVOICE_PROGRAM_ID =
  process.env.NEXT_PUBLIC_ALEO_INVOICE_PROGRAM_ID || "envelop_invoice.aleo";
const PAYMENTS_PROGRAM_ID =
  process.env.NEXT_PUBLIC_ALEO_PAYMENTS_PROGRAM_ID || "envelop_payments.aleo";
const YIELD_PROGRAM_ID =
  process.env.NEXT_PUBLIC_ALEO_YIELD_PROGRAM_ID || "envelop_yield.aleo";
const IDENTITY_PROGRAM_ID =
  process.env.NEXT_PUBLIC_ALEO_IDENTITY_PROGRAM_ID || "envelop_identity_v2.aleo";
const TX_FEE_MICROCREDITS = Number(process.env.NEXT_PUBLIC_ALEO_TX_FEE || 300000);
const ALEO_EXPLORER_BASE =
  process.env.NEXT_PUBLIC_ALEO_EXPLORER || "https://explorer.aleo.org";

const TOKEN_FIELD_MAP: Record<string, string> = {
  ALEO: "1field",
  USDC: "2field",
  WETH: "3field",
};

const WORKSPACE_NAV: Array<{ id: WorkspaceModule; label: string; href: string }> = [
  { id: "overview", label: "Overview", href: "/protocol" },
  { id: "portfolio", label: "Portfolio", href: "/protocol/portfolio" },
  { id: "swap", label: "Swap", href: "/protocol/swap" },
  { id: "yield", label: "Yield", href: "/protocol/yield" },
  { id: "payments", label: "Payments", href: "/protocol/payments" },
  { id: "invoices", label: "Invoices", href: "/protocol/invoices" },
  { id: "history", label: "History", href: "/protocol/history" },
  { id: "relay", label: "Relay", href: "/protocol/relay" },
] as const;

const MODULE_META: Record<
  WorkspaceModule,
  { title: string; description: string; cta: string }
> = {
  overview: {
    title: "Workspace Overview",
    description:
      "Use the module cards below to open one workflow at a time. This keeps actions focused and easier to review.",
    cta: "Select a module to continue.",
  },
  portfolio: {
    title: "Portfolio",
    description: "Track token balances and wallet allocation for your connected account.",
    cta: "Review balances before creating any transaction.",
  },
  swap: {
    title: "Swap",
    description: "Request a quote, sign the swap transition, and confirm settlement on-chain.",
    cta: "Complete quote and execution in sequence.",
  },
  yield: {
    title: "Yield",
    description: "Manage stake, unstake, claim, and rebalance actions using signed transitions.",
    cta: "Validate quote steps before signing.",
  },
  payments: {
    title: "Payments",
    description: "Send private payments to recipients resolved by their on-chain username.",
    cta: "Use exact username and amount before signing.",
  },
  invoices: {
    title: "Invoices",
    description: "Create and settle invoice requests tied to on-chain transaction confirmations.",
    cta: "Check recipient and due date before submitting.",
  },
  history: {
    title: "History",
    description: "Review recent swaps and linked explorer transactions.",
    cta: "Use this page to audit executed swaps.",
  },
  relay: {
    title: "Relay",
    description: "Inspect relay submissions and current status for each Aleo transaction id.",
    cta: "Refresh statuses when proving/indexing is still pending.",
  },
};

const MODULE_SECTIONS: Record<WorkspaceModule, Array<Exclude<WorkspaceModule, "overview">>> = {
  overview: [],
  portfolio: ["portfolio"],
  swap: ["swap"],
  yield: ["yield"],
  payments: ["payments"],
  invoices: ["invoices"],
  history: ["history"],
  relay: ["relay"],
};

function getWorkspaceModule(pathname: string): WorkspaceModule {
  const cleanPath = String(pathname || "").split("?")[0].split("#")[0];
  if (!cleanPath.startsWith("/protocol")) {
    return "overview";
  }
  const rawSegment = cleanPath
    .slice("/protocol".length)
    .split("/")
    .filter(Boolean)[0];
  if (!rawSegment) return "overview";
  const segment = rawSegment.toLowerCase();
  if (segment === "portfolio") return "portfolio";
  if (segment === "swap") return "swap";
  if (segment === "yield") return "yield";
  if (segment === "payments") return "payments";
  if (segment === "invoices") return "invoices";
  if (segment === "history" || segment === "recent-swaps") return "history";
  if (segment === "relay") return "relay";
  return "overview";
}

const U64_MAX = 18446744073709551615n;
const TX_CONFIRM_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_TX_CONFIRM_TIMEOUT_MS || 300000);
const TX_CONFIRM_POLL_MS = Number(process.env.NEXT_PUBLIC_TX_CONFIRM_POLL_MS || 4000);

function tokenToField(tokenId: string): string {
  const field = TOKEN_FIELD_MAP[tokenId.toUpperCase()];
  if (!field) {
    throw new Error(`Unsupported token field mapping for ${tokenId}`);
  }
  return field;
}

function toU64Literal(v: bigint | number | string): string {
  const n = BigInt(v);
  if (n < 0n || n > U64_MAX) {
    throw new Error("Value out of u64 bounds");
  }
  return `${n}u64`;
}

function hashToField(input: string): string {
  let hash = 1469598103934665603n;
  const prime = 1099511628211n;
  const mod = 2n ** 64n;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) % mod;
  }
  return `${hash}field`;
}

function parseDecimalToAtomic(amount: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Invalid amount format");
  }
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Too many decimals. Maximum for this token is ${decimals}`);
  }
  const atomic = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+/, "") || "0";
  return BigInt(atomic);
}

function formatAtomicToDecimal(atomic: string, decimals: number): string {
  const raw = String(atomic);
  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;
  if (!/^\d+$/.test(digits)) {
    return raw;
  }
  if (decimals <= 0) {
    return `${negative ? "-" : ""}${digits}`;
  }
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  const out = fraction ? `${whole}.${fraction}` : whole;
  return negative ? `-${out}` : out;
}

function txExplorerUrl(txId: string): string {
  const base = ALEO_EXPLORER_BASE.replace(/\/+$/, "");
  return `${base}/transaction/${txId}`;
}

function normalizeRelayStatus(rawStatus: string | undefined | null): TxStatus {
  const status = String(rawStatus || "").toLowerCase();

  const failedHints = ["fail", "reject", "invalid", "drop", "error", "revert", "abort"];
  if (failedHints.some((hint) => status.includes(hint))) {
    return "failed";
  }

  const confirmedHints = ["confirm", "final", "success", "complete", "accept", "execut", "includ", "commit"];
  if (confirmedHints.some((hint) => status.includes(hint))) {
    return "confirmed";
  }

  const pendingHints = ["pending", "queue", "process", "broadcast", "submit", "mempool", "not_found", "not found", "unknown"];
  if (pendingHints.some((hint) => status.includes(hint))) {
    return "pending";
  }

  return "pending";
}

function txBadgeClass(status: TxStatus): string {
  if (status === "confirmed") {
    return "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "failed") {
    return "border-red-500/60 bg-red-500/10 text-red-200";
  }
  return "border-yellow-500/60 bg-yellow-500/10 text-yellow-200";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Unknown error");
}

function isExpiredWalletSessionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("dapp not connected") ||
    message.includes("connection expired") ||
    message.includes("session expired")
  );
}

function isAuthSessionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("missing bearer token") ||
    message.includes("invalid session token") ||
    message.includes("session expired")
  );
}

function isPendingRelayError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("not indexed on explorer yet") ||
    message.includes("retry in a few seconds") ||
    message.includes("not yet confirmed") ||
    message.includes("status fetch timed out") ||
    message.includes("not_found")
  );
}

export default function ProtocolPage() {
  const pathname = usePathname();
  const { token, user, expiresAt, hydrated, setSession, clearSession } = useAppAuthStore();
  const { wallet, publicKey, connected, requestTransaction } = useWallet();

  const [authMessage, setAuthMessage] = useState<string>("");
  const [walletAuthBusy, setWalletAuthBusy] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string>("");
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [ledgerMode, setLedgerMode] = useState<string>("");
  const [ledgerNote, setLedgerNote] = useState<string>("");
  const [swaps, setSwaps] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [relaySubmissions, setRelaySubmissions] = useState<any[]>([]);
  const [yieldAssets, setYieldAssets] = useState<YieldAsset[]>([]);
  const [yieldActions, setYieldActions] = useState<YieldHistoryAction[]>([]);
  const [relayStatusByTx, setRelayStatusByTx] = useState<Record<string, RelayStatusSnapshot>>({});
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  const [swapIn, setSwapIn] = useState("ALEO");
  const [swapOut, setSwapOut] = useState("USDC");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapQuote, setSwapQuote] = useState<any>(null);

  const [payToken, setPayToken] = useState("ALEO");
  const [payAmount, setPayAmount] = useState("");
  const [payRecipientUsername, setPayRecipientUsername] = useState("");
  const [payNote, setPayNote] = useState("");

  const [invoiceToken, setInvoiceToken] = useState("USDC");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceRecipientUsername, setInvoiceRecipientUsername] = useState("");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [invoiceDueAt, setInvoiceDueAt] = useState("");
  const [yieldAction, setYieldAction] = useState<"stake" | "unstake" | "claim" | "rebalance">("stake");
  const [yieldAssetId, setYieldAssetId] = useState("");
  const [yieldAmount, setYieldAmount] = useState("");
  const [yieldTargetWeights, setYieldTargetWeights] = useState("");
  const [yieldQuote, setYieldQuote] = useState<YieldQuote | null>(null);
  const [modulesMenuOpen, setModulesMenuOpen] = useState(false);
  const walletAutoAuthRef = useRef<string | null>(null);

  const walletAddress = user?.walletAddress || "-";
  const walletReadyForTx = connected && !!publicKey && !!requestTransaction;
  const hasProfile = Boolean(user?.username);
  const activeModule = useMemo<WorkspaceModule>(() => getWorkspaceModule(pathname), [pathname]);
  const activeModuleMeta = useMemo(() => MODULE_META[activeModule], [activeModule]);
  const visibleSections = useMemo(() => new Set(MODULE_SECTIONS[activeModule]), [activeModule]);
  const showSection = (section: Exclude<WorkspaceModule, "overview">) =>
    visibleSections.has(section);
  const pendingTrackedTxCount = useMemo(
    () => Object.values(relayStatusByTx).filter((snapshot) => snapshot.state === "pending").length,
    [relayStatusByTx]
  );
  const totalActivityItems =
    swaps.length + payments.length + invoices.length + yieldActions.length + relaySubmissions.length;
  const isOnchainMode = ledgerMode === "onchain_canonical";
  const ledgerHeadline = isOnchainMode ? "On-chain mode active" : "Simulation mode active";
  const ledgerSummary = isOnchainMode
    ? "Transactions are settled on-chain. Balances may take a short time to refresh."
    : "Balances and settlement are managed by the backend simulation mode.";

  const tokensById = useMemo(() => {
    const map = new Map<string, TokenMetadata>();
    for (const token of tokens) {
      map.set(token.id, token);
    }
    return map;
  }, [tokens]);

  const availableOutTokens = useMemo(
    () => tokens.filter((t) => t.id !== swapIn),
    [tokens, swapIn]
  );

  const trackedTxIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of payments) {
      if (p?.aleo_tx_id) ids.add(String(p.aleo_tx_id));
    }
    for (const inv of invoices) {
      if (inv?.create_aleo_tx_id) ids.add(String(inv.create_aleo_tx_id));
    }
    for (const s of swaps) {
      if (s?.aleo_tx_id) ids.add(String(s.aleo_tx_id));
    }
    for (const r of relaySubmissions) {
      if (r?.aleo_tx_id) ids.add(String(r.aleo_tx_id));
    }
    for (const a of yieldActions) {
      if (a?.aleoTxId) ids.add(String(a.aleoTxId));
    }
    return Array.from(ids).filter((txId) => txId.startsWith("at1"));
  }, [payments, invoices, swaps, relaySubmissions, yieldActions]);

  const resolveSessionUser = async (sessionToken: string, fallback: any): Promise<any> => {
    try {
      const me = await apiClient.getMe(sessionToken);
      return me?.user || fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (!swapOut || swapOut === swapIn) {
      const fallback = availableOutTokens[0]?.id || "";
      setSwapOut(fallback);
    }
  }, [swapIn, swapOut, availableOutTokens]);

  useEffect(() => {
    if (yieldAssets.length === 0) {
      if (yieldAssetId) {
        setYieldAssetId("");
      }
      return;
    }
    const hasCurrent = yieldAssets.some((asset) => asset.id === yieldAssetId);
    if (!hasCurrent) {
      setYieldAssetId(yieldAssets[0].id);
    }
  }, [yieldAssets, yieldAssetId]);

  const refreshDashboard = async (activeToken: string) => {
    setLoadState("loading");
    setError("");
    try {
      const [tokensRes, balancesRes, swapsRes, paymentsRes, invoicesRes, relayRes, yieldRes] =
        await Promise.all([
          apiClient.getTokens(),
          apiClient.getBalances(activeToken),
          apiClient.listSwaps(activeToken),
          apiClient.listPayments(activeToken),
          apiClient.listInvoices(activeToken),
          apiClient.listRelaySubmissions(activeToken),
          apiClient.getYieldAssets(activeToken),
        ]);
      setTokens(tokensRes.tokens || []);
      setBalances(balancesRes.balances || []);
      setLedgerMode(String(balancesRes.ledgerMode || ""));
      setLedgerNote(String(balancesRes.note || ""));
      setSwaps(swapsRes.swaps || []);
      setPayments(paymentsRes.payments || []);
      setInvoices(invoicesRes.invoices || []);
      setRelaySubmissions(relayRes.submissions || []);
      setYieldAssets(yieldRes.assets || []);
      setYieldActions(yieldRes.actions || []);
      setLoadState("ready");
    } catch (e) {
      if (isAuthSessionError(e)) {
        clearSession();
        setLoadState("idle");
        setAuthMessage("Your app session expired. Sign in again to continue.");
        return;
      }
      setLoadState("error");
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!token) return;
    if (expiresAt && expiresAt <= Date.now()) {
      clearSession();
      setAuthMessage("Your app session expired. Sign in again to continue.");
      return;
    }
    refreshDashboard(token);
  }, [hydrated, token, expiresAt, clearSession]);

  useEffect(() => {
    if (!hydrated) return;
    if (token || !connected || !publicKey || walletAuthBusy) return;
    if (walletAutoAuthRef.current === publicKey) return;
    walletAutoAuthRef.current = publicKey;
    void handleWalletSignIn();
  }, [hydrated, token, connected, publicKey, walletAuthBusy]);

  useEffect(() => {
    if (token) return;
    if (connected && publicKey) return;
    walletAutoAuthRef.current = null;
  }, [token, connected, publicKey]);

  useEffect(() => {
    if (!user) return;
    if (user.username && !profileUsername) {
      setProfileUsername(user.username);
    }
    if (user.displayName && !profileDisplayName) {
      setProfileDisplayName(user.displayName);
    }
  }, [user, profileUsername, profileDisplayName]);

  useEffect(() => {
    setModulesMenuOpen(false);
  }, [activeModule]);

  useEffect(() => {
    if (!modulesMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModulesMenuOpen(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modulesMenuOpen]);

  useEffect(() => {
    setRelayStatusByTx((prev) => {
      const keep = new Set(trackedTxIds);
      let changed = false;
      const next: Record<string, RelayStatusSnapshot> = {};
      Object.entries(prev).forEach(([txId, snapshot]) => {
        if (keep.has(txId)) {
          next[txId] = snapshot;
          return;
        }
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [trackedTxIds]);

  useEffect(() => {
    if (!token || trackedTxIds.length === 0) return;
    let cancelled = false;

    const pollRelayStatuses = async () => {
      const updates = await Promise.all(
        trackedTxIds.map(async (txId) => {
          try {
            const data = await apiClient.getRelayStatus(token, txId);
            const rawStatus = String(data?.status || "unknown");
            return {
              txId,
              snapshot: {
                state: normalizeRelayStatus(rawStatus),
                raw: rawStatus,
                updatedAt: Date.now(),
              } as RelayStatusSnapshot,
            };
          } catch (e) {
            const message = e instanceof Error ? e.message : "status_check_failed";
            return {
              txId,
              snapshot: {
                state: "failed" as TxStatus,
                raw: `error:${message}`,
                updatedAt: Date.now(),
              },
            };
          }
        })
      );

      if (cancelled) return;

      setRelayStatusByTx((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const { txId, snapshot } of updates) {
          const old = prev[txId];
          if (!old || old.state !== snapshot.state || old.raw !== snapshot.raw) {
            next[txId] = snapshot;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    void pollRelayStatuses();
    const intervalId = window.setInterval(() => {
      void pollRelayStatuses();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, trackedTxIds]);

  const copyTxLink = async (txId: string) => {
    const url = txExplorerUrl(txId);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const area = document.createElement("textarea");
        area.value = url;
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setCopiedTxId(txId);
      window.setTimeout(() => {
        setCopiedTxId((current) => (current === txId ? null : current));
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to copy transaction link");
    }
  };

  const shareTxLink = async (txId: string) => {
    const url = txExplorerUrl(txId);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Aleo transaction",
          text: txId,
          url,
        });
        return;
      }
      await copyTxLink(txId);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unable to share transaction link");
    }
  };

  const waitForConfirmedTx = async (activeToken: string, txId: string, context: string) => {
    const startedAt = Date.now();
    const timeoutMs = Number.isFinite(TX_CONFIRM_TIMEOUT_MS) && TX_CONFIRM_TIMEOUT_MS > 0
      ? TX_CONFIRM_TIMEOUT_MS
      : 300_000;
    const pollMs = Number.isFinite(TX_CONFIRM_POLL_MS) && TX_CONFIRM_POLL_MS > 0
      ? TX_CONFIRM_POLL_MS
      : 4_000;
    while (Date.now() - startedAt < timeoutMs) {
      let rawStatus = "unknown";
      let txState: TxStatus = "pending";
      try {
        const statusResponse = await apiClient.getRelayStatus(activeToken, txId);
        rawStatus = String(statusResponse?.status || statusResponse?.txState || "unknown");
        txState = normalizeRelayStatus(String(statusResponse?.txState || rawStatus));
      } catch (error) {
        if (!isPendingRelayError(error)) {
          throw error;
        }
        rawStatus = getErrorMessage(error);
        txState = "pending";
      }
      setRelayStatusByTx((prev) => ({
        ...prev,
        [txId]: {
          state: txState,
          raw: rawStatus,
          updatedAt: Date.now(),
        },
      }));
      if (txState === "confirmed") return;
      if (txState === "failed") {
        throw new Error(`${context} transaction failed on Aleo: ${rawStatus}`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    throw new Error(
      `${context} transaction confirmation timeout after ${Math.ceil(timeoutMs / 1000)} seconds`
    );
  };

  const handleWalletSignIn = async () => {
    try {
      setAuthMessage("Requesting wallet signature...");
      setWalletAuthBusy(true);
      const adapter = wallet?.adapter as
        | {
            publicKey: string | null;
            connect: (
              decryptPermission: DecryptPermission,
              network: WalletAdapterNetwork,
              programs?: string[]
            ) => Promise<void>;
            signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
          }
        | null;
      if (!adapter) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) first");
      }
      if (!adapter.signMessage) {
        throw new Error("Connected wallet does not support message signing");
      }

      const signMessageWithWallet = adapter.signMessage.bind(adapter);
      const getAddress = () => String(adapter.publicKey || publicKey || "");
      const waitForAddress = async () => {
        for (let i = 0; i < 20; i += 1) {
          const value = getAddress();
          if (value) return value;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return "";
      };
      const signChallenge = async (address: string) => {
        const challenge = await apiClient.createWalletAuthChallenge(address);
        const signatureBytes = await signMessageWithWallet(
          new TextEncoder().encode(challenge.message)
        );
        return { challenge, signatureBytes };
      };

      let address = getAddress();
      if (!address) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) first");
      }

      let signed: Awaited<ReturnType<typeof signChallenge>>;
      try {
        signed = await signChallenge(address);
      } catch (error) {
        if (!isExpiredWalletSessionError(error)) {
          throw error;
        }

        setAuthMessage("Wallet connection expired. Please confirm reconnect in Shield...");
        await adapter.connect(
          DecryptPermission.NoDecrypt,
          WalletAdapterNetwork.Testnet,
          []
        );

        address = await waitForAddress();
        if (!address) {
          throw new Error("Wallet reconnected but did not return a public key/address");
        }
        signed = await signChallenge(address);
      }

      const signatureBytes = signed.signatureBytes;

      let signature = "";
      try {
        signature = new TextDecoder().decode(signatureBytes).trim();
      } catch {
        signature = "";
      }
      const signatureBase64 = btoa(String.fromCharCode(...signatureBytes));

      const response = await apiClient.verifyWalletAuth({
        challengeId: signed.challenge.challengeId,
        address,
        signature,
        signatureBase64,
      });

      const sessionUser = await resolveSessionUser(response.token, response.user);

      setSession({
        token: response.token,
        user: sessionUser,
        expiresAt: response.expiresAt,
      });
      setAuthMessage(
        response.warning
          ? `Wallet onboarding complete. ${response.warning}`
          : "Wallet onboarding complete."
      );
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Wallet sign-in failed");
    } finally {
      setWalletAuthBusy(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!token) return;
    try {
      if (user?.username) {
        setAuthMessage(`Username already registered as @${user.username}.`);
        return;
      }
      const username = profileUsername.trim().replace(/^@+/, "").toLowerCase();
      const displayName = profileDisplayName.trim();
      if (!username) {
        throw new Error("Username is required");
      }
      const signerAddress = publicKey;
      const txRequest = requestTransaction;
      if (!walletReadyForTx || !signerAddress || !txRequest) {
        throw new Error("Connect Shield Wallet before registering username");
      }
      setProfileBusy(true);
      setAuthMessage("Signing on-chain username registration...");
      const usernameHash = hashToField(`user:${username}`);
      const displayNameHash = hashToField(`name:${displayName || username}`);
      const registeredAt = BigInt(Math.floor(Date.now() / 1000));
      const nonce = BigInt(Date.now());
      const tx = Transaction.createTransaction(
        signerAddress,
        WalletAdapterNetwork.Testnet,
        IDENTITY_PROGRAM_ID,
        "register_username",
        [
          usernameHash,
          displayNameHash,
          toU64Literal(registeredAt),
          toU64Literal(nonce),
        ],
        TX_FEE_MICROCREDITS,
        false
      );
      const usernameClaimTxId = await txRequest(tx);
      await apiClient.submitRelayTx(token, {
        aleoTxId: usernameClaimTxId,
        clientTxId: `username_${username}`,
      });
      setAuthMessage("Waiting for Aleo confirmation...");
      await waitForConfirmedTx(token, usernameClaimTxId, "Username registration");
      setAuthMessage("Registering profile in backend...");
      const response = await apiClient.upsertProfile(token, {
        username,
        displayName,
        usernameClaimTxId,
      });
      setSession({
        token,
        user: response.user,
        expiresAt: expiresAt || Date.now() + 1000 * 60 * 60 * 24 * 30,
      });
      setAuthMessage(`Profile @${response.user.username} registered. You can now send by username.`);
      await refreshDashboard(token);
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Failed to register profile");
    } finally {
      setProfileBusy(false);
    }
  };

  const handleQuote = async () => {
    if (!token) return;
    try {
      const response = await apiClient.getSwapQuote(token, {
        tokenIn: swapIn,
        tokenOut: swapOut,
        amount: swapAmount,
      });
      setSwapQuote(response.quote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get quote");
    }
  };

  const signSwapRequest = async (quote: any): Promise<string> => {
    if (!publicKey || !requestTransaction) {
      throw new Error("Connect Shield Wallet (or Leo Wallet) before signing");
    }

    const quoteHash = hashToField(quote.id);
    const nonce = BigInt(Date.now());
    const inputs = [
      tokenToField(quote.tokenIn),
      tokenToField(quote.tokenOut),
      toU64Literal(quote.amountInAtomic),
      toU64Literal(quote.amountOutAtomic),
      quoteHash,
      toU64Literal(nonce),
    ];

    const tx = Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.Testnet,
      SWAP_PROGRAM_ID,
      "create_swap_request",
      inputs,
      TX_FEE_MICROCREDITS,
      false
    );

    return requestTransaction(tx);
  };

  const handleSwap = async () => {
    if (!token || !swapQuote?.id) return;
    try {
      if (!walletReadyForTx) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) before executing swap");
      }
      const aleoTxId = await signSwapRequest(swapQuote);
      await apiClient.submitRelayTx(token, {
        aleoTxId,
        clientTxId: swapQuote.id,
      });
      await waitForConfirmedTx(token, aleoTxId, "Swap");
      await apiClient.executeSwap(token, {
        quoteId: swapQuote.id,
        maxSlippageBps: 100,
        aleoTxId,
      });
      setSwapQuote(null);
      await refreshDashboard(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    }
  };

  const handleSendPayment = async () => {
    if (!token) return;
    try {
      if (!walletReadyForTx) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) before sending payment");
      }
      const normalizedRecipientUsername = payRecipientUsername.trim().replace(/^@+/, "").toLowerCase();
      if (!normalizedRecipientUsername) {
        throw new Error("Recipient username is required");
      }
      const tokenMeta = tokens.find((t) => t.id === payToken);
      if (!tokenMeta) {
        throw new Error("Unsupported payment token");
      }

      const resolvedRecipient = await apiClient.resolveRecipientByUsername(
        token,
        normalizedRecipientUsername
      );
      const amountAtomic = parseDecimalToAtomic(payAmount, tokenMeta.decimals);
      const nonce = BigInt(Date.now());
      const paymentClientId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const aleoTxId = await signPaymentIntent({
        recipientHint: resolvedRecipient.username,
        tokenId: payToken,
        amountAtomic,
        note: payNote || "payment",
        nonce,
      });

      await apiClient.submitRelayTx(token, {
        aleoTxId,
        clientTxId: paymentClientId,
      });
      await waitForConfirmedTx(token, aleoTxId, "Payment");

      await apiClient.sendPayment(token, {
        recipientUsername: resolvedRecipient.username,
        recipientAddress: resolvedRecipient.walletAddress,
        tokenId: payToken,
        amount: payAmount,
        note: payNote,
        aleoTxId,
      });
      setPayAmount("1");
      setPayRecipientUsername("");
      setPayNote("");
      await refreshDashboard(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    }
  };

  const signCreateInvoice = async (args: {
    recipientAddress: string;
    tokenId: string;
    amountAtomic: bigint;
    dueAtSeconds: bigint;
    invoiceId: string;
    memo: string;
  }): Promise<string> => {
    if (!publicKey || !requestTransaction) {
      throw new Error("Connect Shield Wallet (or Leo Wallet) before signing");
    }

    const inputs = [
      args.recipientAddress,
      tokenToField(args.tokenId),
      toU64Literal(args.amountAtomic),
      toU64Literal(args.dueAtSeconds),
      hashToField(args.invoiceId),
      hashToField(args.memo || "memo"),
    ];

    const tx = Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.Testnet,
      INVOICE_PROGRAM_ID,
      "create_invoice",
      inputs,
      TX_FEE_MICROCREDITS,
      false
    );
    return requestTransaction(tx);
  };

  const handleCreateInvoice = async () => {
    if (!token) return;
    try {
      if (!walletReadyForTx) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) before creating invoice");
      }
      const normalizedUsername = invoiceRecipientUsername.trim().replace(/^@+/, "").toLowerCase();
      if (!normalizedUsername) {
        throw new Error("Recipient username is required");
      }
      const resolved = await apiClient.resolveRecipientByUsername(token, normalizedUsername);
      const resolvedRecipientAddress = resolved.walletAddress;
      if (!resolvedRecipientAddress.startsWith("aleo1")) {
        throw new Error("Resolved recipient wallet address is invalid");
      }

      const tokenMeta = tokens.find((t) => t.id === invoiceToken);
      if (!tokenMeta) {
        throw new Error("Unsupported invoice token");
      }
      const amountAtomic = parseDecimalToAtomic(invoiceAmount, tokenMeta.decimals);
      const dueAtMs = invoiceDueAt ? new Date(invoiceDueAt).getTime() : Date.now() + 24 * 60 * 60 * 1000;
      const dueAtSeconds = BigInt(Math.floor(dueAtMs / 1000));
      const invoiceClientId = `invoice_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

      const aleoTxId = await signCreateInvoice({
        recipientAddress: resolvedRecipientAddress,
        tokenId: invoiceToken,
        amountAtomic,
        dueAtSeconds,
        invoiceId: invoiceClientId,
        memo: invoiceMemo,
      });

      await apiClient.submitRelayTx(token, {
        aleoTxId,
        clientTxId: invoiceClientId,
      });
      await waitForConfirmedTx(token, aleoTxId, "Invoice create");

      await apiClient.createInvoice(token, {
        recipientUsername: resolved.username,
        recipientAddress: resolvedRecipientAddress,
        tokenId: invoiceToken,
        amount: invoiceAmount,
        memo: invoiceMemo,
        dueAt: dueAtMs,
        aleoTxId,
      });

      setInvoiceAmount("10");
      setInvoiceRecipientUsername("");
      setInvoiceMemo("");
      await refreshDashboard(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice creation failed");
    }
  };

  const signPayInvoice = async (invoice: any): Promise<string> => {
    if (!publicKey || !requestTransaction) {
      throw new Error("Connect Shield Wallet (or Leo Wallet) before signing");
    }
    if (!invoice.creator_address) {
      throw new Error("Invoice is missing creator address");
    }

    const inputs = [
      hashToField(invoice.id),
      invoice.creator_address,
      tokenToField(invoice.token_id),
      toU64Literal(invoice.amount_atomic),
      toU64Literal(BigInt(Math.floor(Date.now() / 1000))),
    ];

    const tx = Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.Testnet,
      INVOICE_PROGRAM_ID,
      "pay_invoice",
      inputs,
      TX_FEE_MICROCREDITS,
      false
    );
    return requestTransaction(tx);
  };

  const handlePayInvoice = async (invoice: any) => {
    if (!token) return;
    try {
      if (!walletReadyForTx) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) before paying invoice");
      }
      const aleoTxId = await signPayInvoice(invoice);
      await apiClient.submitRelayTx(token, {
        aleoTxId,
        clientTxId: invoice.id,
      });
      await waitForConfirmedTx(token, aleoTxId, "Invoice payment");
      await apiClient.payInvoice(token, invoice.id, aleoTxId);
      await refreshDashboard(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice payment failed");
    }
  };

  const signPaymentIntent = async (args: {
    recipientHint: string;
    tokenId: string;
    amountAtomic: bigint;
    note: string;
    nonce: bigint;
  }): Promise<string> => {
    if (!publicKey || !requestTransaction) {
      throw new Error("Connect Shield Wallet (or Leo Wallet) before signing");
    }

    const inputs = [
      hashToField(args.recipientHint),
      tokenToField(args.tokenId),
      toU64Literal(args.amountAtomic),
      hashToField(args.note),
      toU64Literal(args.nonce),
    ];

    const tx = Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.Testnet,
      PAYMENTS_PROGRAM_ID,
      "create_payment_intent",
      inputs,
      TX_FEE_MICROCREDITS,
      false
    );

    return requestTransaction(tx);
  };

  const signYieldTransition = async (transition: YieldTransition): Promise<string> => {
    if (!publicKey || !requestTransaction) {
      throw new Error("Connect Shield Wallet (or Leo Wallet) before signing");
    }

    const tx = Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.Testnet,
      transition.programId || YIELD_PROGRAM_ID,
      transition.functionName,
      transition.inputs,
      TX_FEE_MICROCREDITS,
      false
    );

    return requestTransaction(tx);
  };

  const parseRebalanceTargets = () => {
    let parsed;
    try {
      parsed = JSON.parse(yieldTargetWeights);
    } catch {
      throw new Error("Invalid rebalance JSON. Example: {\"YLD_ALEO_VALIDATOR_STAKE\":0.5,\"YLD_ALEO_DELTA_NEUTRAL\":0.5}");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Rebalance targetWeights must be a JSON object");
    }
    return parsed as Record<string, number>;
  };

  const handleYieldQuote = async () => {
    if (!token) return;
    try {
      setError("");
      if (yieldAction === "rebalance") {
        const targetWeights = parseRebalanceTargets();
        const response = await apiClient.getYieldQuote(token, {
          action: "rebalance",
          targetWeights,
        });
        setYieldQuote(response.quote);
        return;
      }

      if (yieldAction === "claim") {
        const response = await apiClient.getYieldQuote(token, {
          action: "claim",
          assetId: yieldAssetId || undefined,
        });
        setYieldQuote(response.quote);
        return;
      }

      if (!yieldAssetId) {
        throw new Error("Select a yield asset");
      }
      const selected = yieldAssets.find((asset) => asset.id === yieldAssetId);
      if (!selected) {
        throw new Error("Selected yield asset is not available");
      }
      const tokenMeta = tokensById.get(selected.tokenId);
      if (!tokenMeta) {
        throw new Error(`Token metadata missing for ${selected.tokenId}`);
      }
      const amountAtomic = parseDecimalToAtomic(yieldAmount, tokenMeta.decimals);
      if (amountAtomic <= 0n) {
        throw new Error("Amount must be greater than zero");
      }

      const response = await apiClient.getYieldQuote(token, {
        action: yieldAction,
        assetId: yieldAssetId,
        amount: yieldAmount,
      });
      setYieldQuote(response.quote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build yield quote");
    }
  };

  const handleYieldSolve = async () => {
    if (!token || !yieldQuote) return;
    try {
      if (!walletReadyForTx) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) before executing yield action");
      }
      const transitions = yieldQuote.plan?.transitions || [];
      if (transitions.length === 0) {
        throw new Error("Yield quote has no transitions to sign");
      }

      const txIds: string[] = [];
      for (let i = 0; i < transitions.length; i += 1) {
        const transition = transitions[i];
        const txId = await signYieldTransition(transition);
        txIds.push(txId);
        await apiClient.submitRelayTx(token, {
          aleoTxId: txId,
          clientTxId: `${yieldQuote.id}_step_${i + 1}`,
        });
        await waitForConfirmedTx(token, txId, `Yield step ${i + 1}`);
      }

      const response = await apiClient.solveYieldQuote(token, {
        quoteId: yieldQuote.id,
        aleoTxIds: txIds,
        aleoTxId: txIds[txIds.length - 1],
      });
      setYieldActions((current) => [response.action, ...current].slice(0, 30));
      setYieldQuote(null);
      await refreshDashboard(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yield execution failed");
    }
  };

  const checkRelayStatus = async (txId: string) => {
    if (!token || !txId) return;
    try {
      const data = await apiClient.getRelayStatus(token, txId);
      const rawStatus = String(data.status || "unknown");
      setRelayStatusByTx((prev) => ({
        ...prev,
        [txId]: {
          state: normalizeRelayStatus(rawStatus),
          raw: rawStatus,
          updatedAt: Date.now(),
        },
      }));
    } catch (e) {
      setRelayStatusByTx((prev) => ({
        ...prev,
        [txId]: {
          state: "failed",
          raw: e instanceof Error ? `error: ${e.message}` : "error",
          updatedAt: Date.now(),
        },
      }));
    }
  };

  const renderTxActions = (txId: string, linkLabel = "View on Aleo Explorer") => {
    const status = relayStatusByTx[txId]?.state || "pending";
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={txExplorerUrl(txId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 text-[11px]"
          >
            {linkLabel}
          </a>
          <span
            className={`text-[10px] uppercase tracking-wider border px-2 py-[1px] ${txBadgeClass(status)}`}
          >
            {status}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => copyTxLink(txId)}
            className="border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wider"
          >
            {copiedTxId === txId ? "Copied" : "Copy Link"}
          </button>
          <button
            onClick={() => shareTxLink(txId)}
            className="border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wider"
          >
            Share
          </button>
        </div>
      </div>
    );
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto border border-white/10 bg-black/60 p-8 md:p-10">
          <p className="text-sm text-white/70">Restoring your session...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto border border-white/10 bg-black/60 p-8 md:p-10 space-y-6">
          <h1 className="text-3xl font-black tracking-tight uppercase">Wallet Onboarding</h1>
          <p className="text-sm text-white/70">
            Connect your Aleo wallet from the header. After connection, wallet signature login runs automatically.
          </p>

          <div className="space-y-3 border border-white/10 bg-black/72 backdrop-blur-sm p-5">
            <p className="text-xs uppercase tracking-widest text-white/60">Connected Wallet</p>
            <p className="font-mono text-xs break-all text-white/85">
              {publicKey || "Not connected"}
            </p>
            <p className="text-xs text-white/55">1. Click `Connect Wallet` in the top navigation.</p>
            <p className="text-xs text-white/55">2. Approve connection/signature inside Shield or Leo.</p>
            <p className="text-xs text-white/55">3. Continue to one-time username registration.</p>
            {!connected && (
              <div className="border border-white/20 px-3 py-2 text-[11px] text-white/75">
                Waiting for wallet connection...
              </div>
            )}
            {connected && walletAuthBusy && (
              <div className="border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] text-primary">
                Verifying wallet signature...
              </div>
            )}
            {connected && !walletAuthBusy && (
              <button
                onClick={handleWalletSignIn}
                className="w-full border border-primary/60 text-primary px-4 py-3 text-xs font-black uppercase tracking-wider hover:bg-primary/10"
              >
                Retry Wallet Authentication
              </button>
            )}
          </div>

          {authMessage && (
            <div className="border border-white/20 px-4 py-3 text-xs text-white/80">
              {authMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto border border-white/10 bg-black/60 p-8 md:p-10 space-y-6">
          <h1 className="text-3xl font-black tracking-tight uppercase">Create Aleo Profile</h1>
          <p className="text-sm text-white/70">
            Username registration is one-time and on-chain. After this step, users can pay you by username.
          </p>
          <div className="space-y-3 border border-white/10 bg-black/72 backdrop-blur-sm p-4">
            <input
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value.toLowerCase())}
              placeholder="unique username (e.g. aryan_finance)"
              className="w-full bg-black border border-white/20 px-4 py-3 text-sm"
            />
            <input
              value={profileDisplayName}
              onChange={(e) => setProfileDisplayName(e.target.value)}
              placeholder="display name"
              className="w-full bg-black border border-white/20 px-4 py-3 text-sm"
            />
            <button
              onClick={handleCompleteProfile}
              disabled={profileBusy}
              className="w-full bg-primary text-black px-4 py-3 text-sm font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
            >
              {profileBusy ? "Registering..." : "Register Username"}
            </button>
            <p className="text-[11px] text-white/50">
              Username cannot be changed once claimed.
            </p>
          </div>
          <p className="text-xs text-white/50">
            Wallet: <span className="font-mono">{walletAddress}</span>
          </p>
          {authMessage && (
            <div className="border border-white/20 px-4 py-3 text-xs text-white/80">
              {authMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border border-white/10 bg-black/78 backdrop-blur-sm p-6 md:p-8 space-y-5">
          <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Protocol Workspace</p>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                {activeModuleMeta.title}
              </h1>
              <p className="text-sm text-white/70 max-w-3xl">{activeModuleMeta.description}</p>
              <p className="text-xs text-white/55">{activeModuleMeta.cta}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => token && refreshDashboard(token)}
                className="border border-white/30 px-4 py-2 text-xs uppercase font-bold tracking-wider hover:bg-white/10"
              >
                Refresh Data
              </button>
              <button
                onClick={clearSession}
                className="border border-red-500/60 text-red-300 px-4 py-2 text-xs uppercase font-bold tracking-wider hover:bg-red-500/10"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="border border-white/10 bg-black/55 backdrop-blur-sm px-3 py-2">
              <p className="text-white/50 uppercase tracking-wider">Profile</p>
              <p className="text-white/90 mt-1">
                <span className="font-mono">@{user?.username}</span>
                {user?.displayName ? ` (${user.displayName})` : ""}
              </p>
            </div>
            <div className="border border-white/10 bg-black/55 backdrop-blur-sm px-3 py-2">
              <p className="text-white/50 uppercase tracking-wider">Wallet</p>
              <p className="font-mono text-white/90 mt-1 break-all">{walletAddress}</p>
            </div>
            <div className="border border-white/10 bg-black/55 backdrop-blur-sm px-3 py-2">
              <p className="text-white/50 uppercase tracking-wider">Signing Status</p>
              <p className="text-white/90 mt-1">
                {walletReadyForTx
                  ? "Ready to sign transactions"
                  : "Connect Shield or Leo Wallet to sign transactions"}
              </p>
            </div>
          </div>
        </div>

        {authMessage && (
          <div className="border border-white/20 px-4 py-3 text-sm text-white/80">
            {authMessage}
          </div>
        )}

        {ledgerMode && (
          <div className="border border-primary/30 bg-primary/5 px-4 py-3 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary/80">Settlement</p>
            <p className="text-sm text-primary font-semibold">{ledgerHeadline}</p>
            <p className="text-xs text-white/75">{ledgerSummary}</p>
            <p className="text-[11px] text-white/55">
              Current mode: <span className="font-mono">{ledgerMode}</span>
            </p>
            {ledgerNote && ledgerNote !== ledgerSummary && (
              <details className="text-[11px] text-white/55">
                <summary className="cursor-pointer hover:text-white/75">Technical details</summary>
                <p className="mt-2">{ledgerNote}</p>
              </details>
            )}
          </div>
        )}

        {error && (
          <div className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="border border-white/10 bg-black/72 backdrop-blur-sm p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Modules</p>
              <p className="text-[11px] text-white/45 mt-1">
                Open one workflow at a time for a cleaner experience.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModulesMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-xs uppercase tracking-wider text-white/85 hover:border-primary/60 hover:text-primary"
              aria-expanded={modulesMenuOpen}
              aria-label="Toggle protocol modules menu"
              aria-controls="protocol-modules-drawer"
            >
              {modulesMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {modulesMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
          <div className="border border-white/10 px-3 py-2 text-xs text-white/70">
            Active module:{" "}
            <span className="font-mono uppercase text-white/90">{activeModule}</span>
          </div>
        </section>

        <div
          className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity ${
            modulesMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setModulesMenuOpen(false)}
          aria-hidden="true"
        />
        <aside
          id="protocol-modules-drawer"
          className={`fixed top-0 right-0 z-[60] h-full w-full max-w-md border-l border-white/10 bg-[#070a0f] shadow-2xl transition-transform duration-300 ${
            modulesMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          }`}
          aria-hidden={!modulesMenuOpen}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Protocol Menu</p>
              <p className="text-sm text-white/70 mt-1">Choose a workspace module</p>
            </div>
            <button
              type="button"
              onClick={() => setModulesMenuOpen(false)}
              className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-xs uppercase tracking-wider text-white/80 hover:border-primary/60 hover:text-primary"
              aria-label="Close modules menu"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
          <div className="h-[calc(100%-81px)] overflow-y-auto p-4 space-y-3">
            {WORKSPACE_NAV.map((item) => {
              const active = item.id === activeModule;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setModulesMenuOpen(false)}
                  className={`block border px-4 py-3 ${
                    active
                      ? "border-primary/70 bg-primary/10"
                      : "border-white/20 bg-black/60 hover:border-primary/60"
                  }`}
                >
                  <p className={`text-xs uppercase tracking-[0.15em] ${active ? "text-primary" : "text-white/80"}`}>
                    {item.label}
                  </p>
                  <p className="text-sm text-white/90 mt-1">{MODULE_META[item.id].title}</p>
                  <p className="text-xs text-white/60 mt-1">{MODULE_META[item.id].description}</p>
                </Link>
              );
            })}
          </div>
        </aside>

        {activeModule === "overview" && (
          <section className="border border-white/10 bg-black/72 backdrop-blur-sm p-5 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Start Here</h2>
            <p className="text-sm text-white/65">
              Choose a module above to perform actions. Overview only shows account health and activity counts.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="border border-white/10 bg-black/55 backdrop-blur-sm p-4">
                <p className="text-xs uppercase tracking-wider text-white/55">Tokens</p>
                <p className="text-2xl font-black mt-2">{balances.length}</p>
                <p className="text-xs text-white/55 mt-1">Balance rows in your portfolio.</p>
              </div>
              <div className="border border-white/10 bg-black/55 backdrop-blur-sm p-4">
                <p className="text-xs uppercase tracking-wider text-white/55">Pending Relay</p>
                <p className="text-2xl font-black mt-2">{pendingTrackedTxCount}</p>
                <p className="text-xs text-white/55 mt-1">Transactions still confirming/indexing.</p>
              </div>
              <div className="border border-white/10 bg-black/55 backdrop-blur-sm p-4">
                <p className="text-xs uppercase tracking-wider text-white/55">Activity Items</p>
                <p className="text-2xl font-black mt-2">{totalActivityItems}</p>
                <p className="text-xs text-white/55 mt-1">Swaps, payments, invoices, yield, relay logs.</p>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {showSection("portfolio") && (
            <section
            id="portfolio"
            className={`scroll-mt-28 border border-white/10 bg-black/72 backdrop-blur-sm p-6 space-y-4 ${
              showSection("swap") ? "lg:col-span-1" : "lg:col-span-3"
            }`}
            >
              <h2 className="text-lg font-bold uppercase tracking-wide">Portfolio</h2>
              {loadState === "loading" && <p className="text-sm text-white/60">Loading...</p>}
              {balances.length === 0 && (
                <p className="text-sm text-white/60">
                  No portfolio balances found for this wallet yet.
                </p>
              )}
              {balances.map((b) => (
                <div key={b.tokenId} className="border border-white/10 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{b.symbol}</div>
                    <div className="text-xs text-white/50">{b.standard}</div>
                  </div>
                  <div className="text-sm font-mono">{b.amount}</div>
                </div>
              ))}
            </section>
          )}

          {showSection("swap") && (
            <section
            id="swap"
            className={`scroll-mt-28 border border-white/10 bg-black/72 backdrop-blur-sm p-6 space-y-4 ${
              showSection("portfolio") ? "lg:col-span-2" : "lg:col-span-3"
            }`}
            >
            <h2 className="text-lg font-bold uppercase tracking-wide">Swap</h2>
            <p className="text-xs text-white/55">
              On-chain transitions: <span className="font-mono">{SWAP_PROGRAM_ID}/create_swap_request</span>,{" "}
              <span className="font-mono">{SWAP_PROGRAM_ID}/settle_swap_onchain</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={swapIn}
                onChange={(e) => setSwapIn(e.target.value)}
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              >
                {tokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.symbol}
                  </option>
                ))}
              </select>
              <select
                value={swapOut}
                onChange={(e) => setSwapOut(e.target.value)}
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              >
                {availableOutTokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.symbol}
                  </option>
                ))}
              </select>
              <input
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                placeholder="Enter amount"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <button
                onClick={handleQuote}
                disabled={!swapAmount.trim()}
                className="border border-primary/60 text-primary px-3 py-2 text-xs uppercase font-bold tracking-wider hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Get Quote
              </button>
            </div>
            {swapQuote && (
              <div className="border border-white/10 p-4 space-y-2">
                <p className="text-sm">
                  Quote: {swapQuote.amountIn} {swapQuote.tokenIn} -&gt; {swapQuote.amountOut}{" "}
                  {swapQuote.tokenOut}
                </p>
                <p className="text-xs text-white/60">
                  Rate: {swapQuote.rate} | Fee: {swapQuote.feeBps} bps | Expires:{" "}
                  {new Date(swapQuote.expiresAt).toLocaleTimeString()}
                </p>
                <button
                  onClick={handleSwap}
                  className="bg-primary text-black px-4 py-2 text-xs font-black uppercase tracking-wider hover:opacity-90"
                >
                  Sign and Execute Swap
                </button>
              </div>
            )}
            </section>
          )}
        </div>

        {showSection("yield") && (
          <section id="yield" className="scroll-mt-28 border border-white/10 bg-black/72 backdrop-blur-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wide">Yield / Stake</h2>
              <p className="text-xs text-white/55 mt-1">
                Pattern: <span className="font-mono">yield_get_assets</span>,{" "}
                <span className="font-mono">yield_get_quote</span>,{" "}
                <span className="font-mono">yield_solve</span>
              </p>
              <p className="text-xs text-white/55">
                On-chain transitions:{" "}
                <span className="font-mono">{YIELD_PROGRAM_ID}/stake_onchain</span>,{" "}
                <span className="font-mono">{YIELD_PROGRAM_ID}/unstake_onchain</span>,{" "}
                <span className="font-mono">{YIELD_PROGRAM_ID}/claim_onchain</span>,{" "}
                <span className="font-mono">{YIELD_PROGRAM_ID}/rebalance_onchain</span>
              </p>
            </div>
            <button
              onClick={() => token && refreshDashboard(token)}
              className="border border-white/30 px-3 py-2 text-[11px] uppercase tracking-wider font-bold hover:bg-white/10"
            >
              Refresh Yield
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={yieldAction}
                  onChange={(e) => setYieldAction(e.target.value as "stake" | "unstake" | "claim" | "rebalance")}
                  className="bg-black border border-white/20 px-3 py-2 text-sm"
                >
                  <option value="stake">Stake</option>
                  <option value="unstake">Unstake</option>
                  <option value="claim">Claim Rewards</option>
                  <option value="rebalance">Rebalance</option>
                </select>
                {yieldAction !== "rebalance" && (
                  <select
                    value={yieldAssetId}
                    onChange={(e) => setYieldAssetId(e.target.value)}
                    className="bg-black border border-white/20 px-3 py-2 text-sm"
                  >
                    {yieldAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {(yieldAction === "stake" || yieldAction === "unstake") && (
                <input
                  value={yieldAmount}
                  onChange={(e) => setYieldAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-black border border-white/20 px-3 py-2 text-sm"
                />
              )}

              {yieldAction === "rebalance" && (
                <textarea
                  value={yieldTargetWeights}
                  onChange={(e) => setYieldTargetWeights(e.target.value)}
                  placeholder='{"ASSET_ID":0.5,"ASSET_ID_2":0.5}'
                  rows={5}
                  className="w-full bg-black border border-white/20 px-3 py-2 text-xs font-mono"
                />
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleYieldQuote}
                  disabled={
                    (yieldAction === "stake" || yieldAction === "unstake") && !yieldAmount.trim()
                  }
                  className="border border-primary/60 text-primary px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Get Yield Quote
                </button>
                {yieldQuote && (
                  <button
                    onClick={handleYieldSolve}
                    className="bg-primary text-black px-4 py-2 text-xs uppercase tracking-wider font-black hover:opacity-90"
                  >
                    Sign and Execute
                  </button>
                )}
              </div>

              {yieldQuote && (
                <div className="border border-white/10 p-3 space-y-2 text-xs">
                  <div className="text-white/80">
                    Quote <span className="font-mono">{yieldQuote.id}</span> ({yieldQuote.action})
                  </div>
                  <div className="text-white/60">
                    Steps: {yieldQuote.plan.steps.length} | Transitions: {yieldQuote.plan.transitions.length} | Expires:{" "}
                    {new Date(yieldQuote.expiresAt).toLocaleTimeString()}
                  </div>
                  <div className="space-y-1">
                    {yieldQuote.plan.steps.map((step, index) => (
                      <div key={`${step.assetId}_${index}`} className="border border-white/10 px-2 py-1 text-[11px]">
                        {step.type.toUpperCase()} {step.amountAtomic} {step.tokenId} on {step.assetId}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
                Yield Assets
              </h3>
              {yieldAssets.length === 0 && (
                <p className="text-xs text-white/60">No yield assets available.</p>
              )}
              {yieldAssets.slice(0, 6).map((asset) => {
                const decimals = tokensById.get(asset.tokenId)?.decimals ?? 6;
                const staked = formatAtomicToDecimal(asset.position.stakedAtomic, decimals);
                const unclaimed = formatAtomicToDecimal(asset.position.unclaimedAtomic, decimals);
                return (
                  <div key={asset.id} className="border border-white/10 bg-black/55 backdrop-blur-sm p-3 text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold">{asset.name}</span>
                      <span className="text-white/60">{(asset.apyBps / 100).toFixed(2)}% APY</span>
                    </div>
                    <div className="text-white/55">
                      {asset.protocol} | {asset.strategyType} | risk {asset.riskLevel}
                    </div>
                    <div className="text-white/70">
                      Staked {staked} {asset.tokenSymbol} | Unclaimed {unclaimed} {asset.rewardTokenSymbol}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
              Recent Yield Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {yieldActions.length === 0 && (
                <p className="text-xs text-white/60 md:col-span-2">No yield actions yet.</p>
              )}
              {yieldActions.slice(0, 6).map((action) => (
                <div key={action.id} className="border border-white/10 bg-black/55 backdrop-blur-sm p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="uppercase">{action.action}</span>
                    <span className="text-white/60">{action.status}</span>
                  </div>
                  <div className="text-white/50">quote: {action.quoteId || "-"}</div>
                  {action.aleoTxId && renderTxActions(action.aleoTxId, "View Yield Tx")}
                </div>
              ))}
            </div>
          </div>
          </section>
        )}

        {(showSection("payments") || showSection("invoices")) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {showSection("payments") && (
              <section id="payments" className="scroll-mt-28 border border-white/10 bg-black/72 backdrop-blur-sm p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Send Payment</h2>
            <p className="text-xs text-white/55">
              On-chain transition:{" "}
              <span className="font-mono">{PAYMENTS_PROGRAM_ID}/create_payment_intent</span>,{" "}
              <span className="font-mono">{PAYMENTS_PROGRAM_ID}/settle_payment_onchain</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={payRecipientUsername}
                onChange={(e) => setPayRecipientUsername(e.target.value)}
                placeholder="Recipient username (e.g. aryan)"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <select
                value={payToken}
                onChange={(e) => setPayToken(e.target.value)}
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              >
                {tokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.symbol}
                  </option>
                ))}
              </select>
              <input
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Note"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleSendPayment}
              disabled={!payRecipientUsername.trim() || !payAmount.trim()}
              className="bg-primary text-black px-4 py-2 text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send Payment
            </button>
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
                Recent Payments
              </h3>
              {payments.length === 0 && (
                <p className="text-xs text-white/60">No payment history yet.</p>
              )}
              {payments.slice(0, 8).map((p) => (
                <div key={p.id} className="border border-white/10 bg-black/55 backdrop-blur-sm p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span>
                      {p.token_id} {p.amount_atomic}
                    </span>
                    <span className="text-white/60">{p.status}</span>
                  </div>
                  <div className="text-white/60">
                    to @{p.recipient_username || "unknown"}
                  </div>
                  {p.aleo_tx_id && renderTxActions(p.aleo_tx_id)}
                </div>
              ))}
            </div>
              </section>
            )}

            {showSection("invoices") && (
              <section id="invoices" className="scroll-mt-28 border border-white/10 bg-black/72 backdrop-blur-sm p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Invoices</h2>
            <p className="text-xs text-white/55">
              On-chain transitions:{" "}
              <span className="font-mono">{INVOICE_PROGRAM_ID}/create_invoice</span>,{" "}
              <span className="font-mono">{INVOICE_PROGRAM_ID}/pay_invoice_onchain</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={invoiceRecipientUsername}
                onChange={(e) => setInvoiceRecipientUsername(e.target.value)}
                placeholder="Recipient username (e.g. aryan)"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <select
                value={invoiceToken}
                onChange={(e) => setInvoiceToken(e.target.value)}
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              >
                {tokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.symbol}
                  </option>
                ))}
              </select>
              <input
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="Enter amount"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <input
                value={invoiceDueAt}
                onChange={(e) => setInvoiceDueAt(e.target.value)}
                type="datetime-local"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <input
                value={invoiceMemo}
                onChange={(e) => setInvoiceMemo(e.target.value)}
                placeholder="Memo"
                className="md:col-span-2 bg-black border border-white/20 px-3 py-2 text-sm"
              />
            </div>
            <p className="text-[11px] text-white/55">
              Recipient wallet is auto-resolved from the username.
            </p>
            <button
              onClick={handleCreateInvoice}
              disabled={!invoiceRecipientUsername.trim() || !invoiceAmount.trim()}
              className="bg-primary text-black px-4 py-2 text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sign and Create Invoice
            </button>
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Open Invoices</h3>
              {invoices.length === 0 && (
                <p className="text-xs text-white/60">No invoices yet.</p>
              )}
              {invoices.slice(0, 10).map((inv) => (
                <div key={inv.id} className="border border-white/10 bg-black/55 backdrop-blur-sm p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span>
                      {inv.token_id} {inv.amount_atomic}
                    </span>
                    <span className="text-white/60">{inv.status}</span>
                  </div>
                  <div className="text-white/60">{inv.memo || "-"}</div>
                  <div className="text-white/60">to @{inv.recipient_username || "unknown"}</div>
                  {inv.payment_id && (
                    <div className="text-[11px] text-white/55">payment id {inv.payment_id}</div>
                  )}
                  {inv.create_aleo_tx_id && renderTxActions(inv.create_aleo_tx_id, "View Invoice Tx")}
                  {inv.status === "open" && inv.creator_user_id !== user?.id && (
                    <button
                      onClick={() => handlePayInvoice(inv)}
                      className="border border-primary/60 text-primary px-3 py-1 text-[11px] uppercase font-bold tracking-wider hover:bg-primary/10"
                    >
                      Sign and Pay Invoice
                    </button>
                  )}
                </div>
              ))}
            </div>
              </section>
            )}
          </div>
        )}

        {showSection("history") && (
          <section id="recent-swaps" className="scroll-mt-28 border border-white/10 bg-black/72 backdrop-blur-sm p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Recent Swaps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {swaps.length === 0 && (
                <p className="text-xs text-white/60 md:col-span-2 xl:col-span-3">No swaps yet.</p>
              )}
              {swaps.slice(0, 9).map((s) => (
                <div key={s.id} className="border border-white/10 bg-black/55 backdrop-blur-sm p-3 text-xs space-y-1">
                  <div>
                    {s.token_in} {s.amount_in_atomic} -&gt; {s.token_out} {s.amount_out_atomic}
                  </div>
                  <div className="text-white/60">rate {s.rate}</div>
                  {s.aleo_tx_id && renderTxActions(s.aleo_tx_id)}
                </div>
              ))}
            </div>
          </section>
        )}

        {showSection("relay") && (
          <section id="relay" className="scroll-mt-28 border border-white/10 bg-black/72 backdrop-blur-sm p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Relay Submissions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relaySubmissions.length === 0 && (
                <p className="text-xs text-white/60 md:col-span-2">No relay submissions yet.</p>
              )}
              {relaySubmissions.slice(0, 12).map((r) => (
                <div key={r.id} className="border border-white/10 bg-black/55 backdrop-blur-sm p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono">{r.mode}</span>
                    <span className="text-white/60">{r.status}</span>
                  </div>
                  <div className="text-white/60">client tx: {r.client_tx_id || "-"}</div>
                  {r.aleo_tx_id && (
                    <div className="space-y-1">
                      {renderTxActions(r.aleo_tx_id)}
                      <div>
                        <button
                          onClick={() => checkRelayStatus(r.aleo_tx_id)}
                          className="border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wider"
                        >
                          Refresh Status
                        </button>
                      </div>
                      {relayStatusByTx[r.aleo_tx_id] && (
                        <div className="text-[11px] text-white/70">
                          raw: {relayStatusByTx[r.aleo_tx_id].raw}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

