"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import {
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
const TX_FEE_MICROCREDITS = Number(process.env.NEXT_PUBLIC_ALEO_TX_FEE || 300000);
const ALEO_EXPLORER_BASE =
  process.env.NEXT_PUBLIC_ALEO_EXPLORER || "https://explorer.aleo.org";

const TOKEN_FIELD_MAP: Record<string, string> = {
  ALEO: "1field",
  USDC: "2field",
  WETH: "3field",
};

const U64_MAX = 18446744073709551615n;

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

  const confirmedHints = ["confirm", "final", "success", "complete", "execut", "includ", "commit"];
  if (confirmedHints.some((hint) => status.includes(hint))) {
    return "confirmed";
  }

  const pendingHints = ["pending", "queue", "process", "broadcast", "submit", "mempool", "accept"];
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

export default function ProtocolPage() {
  const { token, user, setSession, clearSession } = useAppAuthStore();
  const { publicKey, connected, requestTransaction, signMessage } = useWallet();

  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pin, setPin] = useState("");
  const [authMessage, setAuthMessage] = useState<string>("");
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [walletAuthBusy, setWalletAuthBusy] = useState(false);
  const [showOtpFallback, setShowOtpFallback] = useState(false);

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string>("");
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
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
  const [swapAmount, setSwapAmount] = useState("1");
  const [swapQuote, setSwapQuote] = useState<any>(null);

  const [payToken, setPayToken] = useState("ALEO");
  const [payAmount, setPayAmount] = useState("1");
  const [payPhone, setPayPhone] = useState("");
  const [payNote, setPayNote] = useState("");

  const [invoiceToken, setInvoiceToken] = useState("USDC");
  const [invoiceAmount, setInvoiceAmount] = useState("10");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceRecipientAddress, setInvoiceRecipientAddress] = useState("");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [invoiceDueAt, setInvoiceDueAt] = useState("");
  const [yieldAction, setYieldAction] = useState<"stake" | "unstake" | "claim" | "rebalance">("stake");
  const [yieldAssetId, setYieldAssetId] = useState("");
  const [yieldAmount, setYieldAmount] = useState("1");
  const [yieldTargetWeights, setYieldTargetWeights] = useState('{"YLD_ALEO_VALIDATOR_STAKE":0.5,"YLD_ALEO_DELTA_NEUTRAL":0.5}');
  const [yieldQuote, setYieldQuote] = useState<YieldQuote | null>(null);

  const walletAddress = user?.walletAddress || "-";
  const walletReadyForTx = connected && !!publicKey && !!requestTransaction;

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
      setSwaps(swapsRes.swaps || []);
      setPayments(paymentsRes.payments || []);
      setInvoices(invoicesRes.invoices || []);
      setRelaySubmissions(relayRes.submissions || []);
      setYieldAssets(yieldRes.assets || []);
      setYieldActions(yieldRes.actions || []);
      setLoadState("ready");
    } catch (e) {
      setLoadState("error");
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  };

  useEffect(() => {
    if (token) {
      refreshDashboard(token);
    }
  }, [token]);

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

  const handleSendOtp = async () => {
    try {
      setAuthMessage("");
      const response = await apiClient.sendWhatsappOtp(phone);
      setChallengeId(response.challengeId);
      setDevOtpCode(response.devCode || null);
      setAuthMessage(
        response.devCode
          ? "OTP sent via mock mode (development)."
          : "OTP sent to your WhatsApp number."
      );
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Failed to send OTP");
    }
  };

  const handleWalletSignIn = async () => {
    try {
      setAuthMessage("");
      if (!connected || !publicKey) {
        throw new Error("Connect Shield Wallet (or Leo Wallet) first");
      }
      if (!signMessage) {
        throw new Error("Connected wallet does not support message signing");
      }

      setWalletAuthBusy(true);

      const challenge = await apiClient.createWalletAuthChallenge(publicKey);
      const signatureBytes = await signMessage(new TextEncoder().encode(challenge.message));

      let signature = "";
      try {
        signature = new TextDecoder().decode(signatureBytes).trim();
      } catch {
        signature = "";
      }
      const signatureBase64 = btoa(String.fromCharCode(...signatureBytes));

      const response = await apiClient.verifyWalletAuth({
        challengeId: challenge.challengeId,
        address: publicKey,
        signature,
        signatureBase64,
      });

      setSession({
        token: response.token,
        user: response.user,
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

  const handleVerifyOtp = async () => {
    try {
      const response = await apiClient.verifyWhatsappOtp({
        phone,
        challengeId,
        code: otpCode,
        pin,
      });
      setSession({
        token: response.token,
        user: response.user,
        expiresAt: response.expiresAt,
      });
      setAuthMessage("Onboarding complete. Wallet bound to your mobile account.");
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Failed to verify OTP");
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
      WalletAdapterNetwork.TestnetBeta,
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
      if (!payPhone.trim()) {
        throw new Error("Recipient phone is required");
      }
      const tokenMeta = tokens.find((t) => t.id === payToken);
      if (!tokenMeta) {
        throw new Error("Unsupported payment token");
      }

      const amountAtomic = parseDecimalToAtomic(payAmount, tokenMeta.decimals);
      const nonce = BigInt(Date.now());
      const paymentClientId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const aleoTxId = await signPaymentIntent({
        recipientHint: payPhone,
        tokenId: payToken,
        amountAtomic,
        note: payNote || "payment",
        nonce,
      });

      await apiClient.submitRelayTx(token, {
        aleoTxId,
        clientTxId: paymentClientId,
      });

      await apiClient.sendPayment(token, {
        recipientPhone: payPhone,
        tokenId: payToken,
        amount: payAmount,
        note: payNote,
        aleoTxId,
      });
      setPayAmount("1");
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
      WalletAdapterNetwork.TestnetBeta,
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
      if (!invoiceRecipientAddress.startsWith("aleo1")) {
        throw new Error("Recipient Aleo address is required for on-chain invoice creation");
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
        recipientAddress: invoiceRecipientAddress,
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

      await apiClient.createInvoice(token, {
        recipientPhone: invoicePhone,
        recipientAddress: invoiceRecipientAddress,
        tokenId: invoiceToken,
        amount: invoiceAmount,
        memo: invoiceMemo,
        dueAt: dueAtMs,
        aleoTxId,
      });

      setInvoiceAmount("10");
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
      WalletAdapterNetwork.TestnetBeta,
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
      WalletAdapterNetwork.TestnetBeta,
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
      WalletAdapterNetwork.TestnetBeta,
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
      }

      const response = await apiClient.solveYieldQuote(token, {
        quoteId: yieldQuote.id,
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

  if (!token) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto border border-white/10 bg-black/60 p-8 md:p-10 space-y-8">
          <h1 className="text-3xl font-black tracking-tight uppercase">
            Wallet Onboarding
          </h1>
          <p className="text-sm text-white/70">
            One-click login with Shield Wallet (or Leo Wallet). No OTP required.
          </p>

          <div className="space-y-4 border border-white/10 bg-black/40 p-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60">Connected Wallet</p>
              <p className="font-mono text-xs mt-1 break-all text-white/85">
                {publicKey || "Not connected"}
              </p>
            </div>
            <button
              onClick={handleWalletSignIn}
              disabled={!connected || !publicKey || walletAuthBusy}
              className="w-full bg-primary text-black px-4 py-3 text-sm font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {walletAuthBusy ? "Signing..." : "Sign In With Wallet"}
            </button>
            <p className="text-[11px] text-white/50">
              Tip: Use the wallet button in the top navigation to connect Shield Wallet.
            </p>
          </div>

          <button
            onClick={() => setShowOtpFallback((v) => !v)}
            className="w-full border border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/10"
          >
            {showOtpFallback ? "Hide OTP Fallback" : "Use OTP Fallback (Legacy)"}
          </button>

          {showOtpFallback && (
            <div className="space-y-3 border border-white/10 bg-black/40 p-4">
              <label className="block text-xs uppercase tracking-widest text-white/60">
                Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1XXXXXXXXXX"
                className="w-full bg-black border border-white/20 px-4 py-3 text-sm"
              />
              <button
                onClick={handleSendOtp}
                className="w-full border border-primary/60 text-primary px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary/10 transition-colors"
              >
                Send WhatsApp OTP
              </button>

              <label className="block text-xs uppercase tracking-widest text-white/60">
                Challenge ID
              </label>
              <input
                value={challengeId}
                onChange={(e) => setChallengeId(e.target.value)}
                placeholder="Paste challenge id"
                className="w-full bg-black border border-white/20 px-4 py-3 text-sm"
              />
              <label className="block text-xs uppercase tracking-widest text-white/60">
                OTP Code
              </label>
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full bg-black border border-white/20 px-4 py-3 text-sm"
              />
              <label className="block text-xs uppercase tracking-widest text-white/60">
                4+ Digit PIN (Encrypts Wallet Keys)
              </label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                placeholder="PIN"
                className="w-full bg-black border border-white/20 px-4 py-3 text-sm"
              />
              <button
                onClick={handleVerifyOtp}
                className="w-full bg-primary text-black px-4 py-3 text-sm font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Verify and Create Wallet
              </button>
            </div>
          )}

          {devOtpCode && (
            <div className="border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
              Development OTP code: <strong>{devOtpCode}</strong>
            </div>
          )}
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
        <div className="border border-white/10 bg-black/50 p-6 md:p-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              Envelop Private Finance
            </h1>
            <p className="text-sm text-white/70 mt-2">
              Wallet: <span className="font-mono">{walletAddress}</span>
            </p>
            <p className="text-xs text-white/50 mt-1">
              Wallet: {walletReadyForTx ? "Connected for signing" : "Connect Shield or Leo Wallet to sign swap/invoice txs"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => token && refreshDashboard(token)}
              className="border border-white/30 px-4 py-2 text-xs uppercase font-bold tracking-wider hover:bg-white/10"
            >
              Refresh
            </button>
            <button
              onClick={clearSession}
              className="border border-red-500/60 text-red-300 px-4 py-2 text-xs uppercase font-bold tracking-wider hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 border border-white/10 bg-black/40 p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Portfolio</h2>
            {loadState === "loading" && <p className="text-sm text-white/60">Loading...</p>}
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

          <section className="lg:col-span-2 border border-white/10 bg-black/40 p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Swap</h2>
            <p className="text-xs text-white/55">
              On-chain transition: <span className="font-mono">{SWAP_PROGRAM_ID}/create_swap_request</span>
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
                placeholder="Amount"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <button
                onClick={handleQuote}
                className="border border-primary/60 text-primary px-3 py-2 text-xs uppercase font-bold tracking-wider hover:bg-primary/10"
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
        </div>

        <section className="border border-white/10 bg-black/40 p-6 space-y-5">
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
                <span className="font-mono">{YIELD_PROGRAM_ID}/stake</span>,{" "}
                <span className="font-mono">{YIELD_PROGRAM_ID}/unstake</span>,{" "}
                <span className="font-mono">{YIELD_PROGRAM_ID}/claim</span>,{" "}
                <span className="font-mono">{YIELD_PROGRAM_ID}/rebalance</span>
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
                  placeholder="Amount"
                  className="w-full bg-black border border-white/20 px-3 py-2 text-sm"
                />
              )}

              {yieldAction === "rebalance" && (
                <textarea
                  value={yieldTargetWeights}
                  onChange={(e) => setYieldTargetWeights(e.target.value)}
                  rows={5}
                  className="w-full bg-black border border-white/20 px-3 py-2 text-xs font-mono"
                />
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleYieldQuote}
                  className="border border-primary/60 text-primary px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-primary/10"
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
                  <div key={asset.id} className="border border-white/10 p-3 text-xs space-y-1">
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
              {yieldActions.slice(0, 6).map((action) => (
                <div key={action.id} className="border border-white/10 p-3 text-xs space-y-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="border border-white/10 bg-black/40 p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Send Payment</h2>
            <p className="text-xs text-white/55">
              On-chain transition:{" "}
              <span className="font-mono">{PAYMENTS_PROGRAM_ID}/create_payment_intent</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
                placeholder="Recipient phone (+1...)"
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
                placeholder="Amount"
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
              className="bg-primary text-black px-4 py-2 text-xs font-black uppercase tracking-wider hover:opacity-90"
            >
              Send Payment
            </button>
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
                Recent Payments
              </h3>
              {payments.slice(0, 8).map((p) => (
                <div key={p.id} className="border border-white/10 p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span>
                      {p.token_id} {p.amount_atomic}
                    </span>
                    <span className="text-white/60">{p.status}</span>
                  </div>
                  {p.aleo_tx_id && renderTxActions(p.aleo_tx_id)}
                </div>
              ))}
            </div>
          </section>

          <section className="border border-white/10 bg-black/40 p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">Invoices</h2>
            <p className="text-xs text-white/55">
              On-chain transitions:{" "}
              <span className="font-mono">{INVOICE_PROGRAM_ID}/create_invoice</span>,{" "}
              <span className="font-mono">{INVOICE_PROGRAM_ID}/pay_invoice</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={invoicePhone}
                onChange={(e) => setInvoicePhone(e.target.value)}
                placeholder="Recipient phone (+1...)"
                className="bg-black border border-white/20 px-3 py-2 text-sm"
              />
              <input
                value={invoiceRecipientAddress}
                onChange={(e) => setInvoiceRecipientAddress(e.target.value)}
                placeholder="Recipient Aleo address (aleo1...)"
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
                placeholder="Amount"
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
            <button
              onClick={handleCreateInvoice}
              className="bg-primary text-black px-4 py-2 text-xs font-black uppercase tracking-wider hover:opacity-90"
            >
              Sign and Create Invoice
            </button>
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Open Invoices</h3>
              {invoices.slice(0, 10).map((inv) => (
                <div key={inv.id} className="border border-white/10 p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span>
                      {inv.token_id} {inv.amount_atomic}
                    </span>
                    <span className="text-white/60">{inv.status}</span>
                  </div>
                  <div className="text-white/60">{inv.memo || "-"}</div>
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
        </div>

        <section className="border border-white/10 bg-black/40 p-6 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide">Recent Swaps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {swaps.slice(0, 9).map((s) => (
              <div key={s.id} className="border border-white/10 p-3 text-xs space-y-1">
                <div>
                  {s.token_in} {s.amount_in_atomic} -&gt; {s.token_out} {s.amount_out_atomic}
                </div>
                <div className="text-white/60">rate {s.rate}</div>
                {s.aleo_tx_id && renderTxActions(s.aleo_tx_id)}
              </div>
            ))}
          </div>
        </section>

        <section className="border border-white/10 bg-black/40 p-6 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide">Relay Submissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {relaySubmissions.slice(0, 12).map((r) => (
              <div key={r.id} className="border border-white/10 p-3 text-xs space-y-2">
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
      </div>
    </div>
  );
}
