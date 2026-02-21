"use client";

import {
  AleoDeployment,
  AleoTransaction,
  BaseMessageSignerWalletAdapter,
  DecryptPermission,
  scopePollingDetectionStrategy,
  WalletAdapterNetwork,
  WalletConnectionError,
  WalletDecryptionError,
  WalletDecryptionNotAllowedError,
  WalletDisconnectionError,
  WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  WalletRecordsError,
  WalletSignTransactionError,
  WalletTransactionError,
} from "@demox-labs/aleo-wallet-adapter-base";

type ShieldWalletLike = {
  publicKey?: string;
  address?: string;
  isAvailable?: () => Promise<boolean>;
  connect?: (...args: any[]) => Promise<any>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<any>;
  executeTransaction?: (transaction: any) => Promise<any>;
  executeDeployment?: (deployment: AleoDeployment) => Promise<any>;
  decrypt?: (
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number
  ) => Promise<any>;
  requestRecords?: (program: string) => Promise<any>;
  requestRecordPlaintexts?: (program: string) => Promise<any>;
  requestTransaction?: (transaction: any) => Promise<any>;
  requestExecution?: (transaction: any) => Promise<any>;
  requestBulkTransactions?: (transactions: any[]) => Promise<any>;
  requestDeploy?: (deployment: AleoDeployment) => Promise<any>;
  requestTransactionHistory?: (program: string) => Promise<any>;
  transactionStatus?: (transactionId: string) => Promise<any>;
  transitionViewKeys?: (transactionId: string) => Promise<any>;
  getExecution?: (transactionId: string) => Promise<any>;
  request?: (input: { method: string; params?: any[] }) => Promise<any>;
};

type ShieldWindow = Window & {
  shieldWallet?: ShieldWalletLike;
  shield?: ShieldWalletLike;
  aleo?: any;
};

type ShieldExecutionPayload = {
  program: string;
  function: string;
  inputs: string[];
  network: "mainnet" | "testnet" | "canary";
  fee?: number;
  privateFee?: boolean;
};

export interface ShieldWalletAdapterConfig {
  appName?: string;
}

const SHIELD_ICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
    <rect width="64" height="64" rx="12" fill="#0A0A0A"/>
    <path d="M32 8L50 15V31C50 42 43 52 32 56C21 52 14 42 14 31V15L32 8Z" fill="#E6FF4A"/>
    <path d="M24 28H40V33H24V28Z" fill="#0A0A0A"/>
    <path d="M24 20H40V25H24V20Z" fill="#0A0A0A"/>
  </svg>`
)}`;

function detectShieldWallet(): ShieldWalletLike | null {
  if (typeof window === "undefined") return null;
  const w = window as ShieldWindow;

  return (
    w.shield ||
    w.shieldWallet ||
    w.aleo?.shield ||
    w.aleo?.shieldWallet ||
    w.aleo?.providers?.shield ||
    null
  );
}

function extractTransactionId(result: any): string {
  if (typeof result === "string" && result.trim()) {
    return result.trim();
  }
  return (
    result?.transactionId ||
    result?.transaction_id ||
    result?.txId ||
    result?.tx_id ||
    result?.id ||
    result?.hash ||
    result?.result?.transactionId ||
    result?.result?.transaction_id ||
    result?.result?.txId ||
    result?.result?.tx_id ||
    result?.result?.id ||
    result?.result?.hash ||
    result?.data?.transactionId ||
    result?.data?.transaction_id ||
    result?.data?.txId ||
    result?.data?.tx_id ||
    result?.data?.id ||
    result?.data?.hash ||
    result?.transaction?.id ||
    result?.transaction?.transactionId ||
    result?.transaction?.transaction_id ||
    ""
  );
}

function serializeDebugValue(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isUserRejectedError(error: unknown): boolean {
  const code = (error as any)?.code ?? (error as any)?.data?.code;
  if (code === 4001) return true;
  const message = String((error as any)?.message || error || "").toLowerCase();
  return (
    message.includes("reject") ||
    message.includes("denied") ||
    message.includes("declined") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  );
}

function normalizeShieldNetwork(network: unknown): "mainnet" | "testnet" | "canary" {
  const value = String(network || "").trim().toLowerCase();
  if (value === "mainnet" || value === "mainnetbeta") return "mainnet";
  if (value === "testnet" || value === "testnetbeta") return "testnet";
  if (value === "canary" || value === "canarybeta") return "canary";
  if (value.includes("main")) return "mainnet";
  if (value.includes("canary")) return "canary";
  return "testnet";
}

function normalizeShieldInput(input: any): string {
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean" || typeof input === "bigint") {
    return String(input);
  }
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function toShieldExecutionPayload(transaction: AleoTransaction): ShieldExecutionPayload {
  const tx = transaction as any;
  const transition = Array.isArray(tx?.transitions) ? tx.transitions[0] : null;
  const program = transition?.program ?? tx?.program;
  const functionName = transition?.functionName ?? tx?.function ?? tx?.functionName;
  const rawInputs = transition?.inputs ?? tx?.inputs ?? [];
  if (!program || !functionName) {
    throw new Error("Invalid transaction object: missing program/function");
  }
  if (!Array.isArray(rawInputs)) {
    throw new Error("Invalid transaction object: inputs must be an array");
  }

  const payload: ShieldExecutionPayload = {
    program: String(program),
    function: String(functionName),
    inputs: rawInputs.map((input: any) => normalizeShieldInput(input)),
    network: normalizeShieldNetwork(tx?.chainId ?? tx?.network),
  };

  const fee = Number(tx?.fee);
  if (Number.isFinite(fee) && fee > 0) {
    payload.fee = Math.trunc(fee);
  }
  const privateFee = tx?.feePrivate ?? tx?.privateFee;
  if (typeof privateFee === "boolean") {
    payload.privateFee = privateFee;
  }

  return payload;
}

const TX_ID_RESOLVE_TIMEOUT_MS = parsePositiveInt(
  process.env.NEXT_PUBLIC_WALLET_TX_ID_RESOLVE_TIMEOUT_MS,
  180000
);
const TX_ID_RESOLVE_INTERVAL_MS = parsePositiveInt(
  process.env.NEXT_PUBLIC_WALLET_TX_ID_RESOLVE_INTERVAL_MS,
  2500
);
const FAILED_STATUS_HINTS = ["fail", "reject", "invalid", "drop", "error", "revert", "abort"];

function isAleoTxId(txId: string): boolean {
  return /^at1[0-9a-z]+$/i.test(String(txId || ""));
}

function pickStatusText(payload: any): string {
  const status =
    payload?.status ||
    payload?.state ||
    payload?.result?.status ||
    payload?.result?.state ||
    payload?.data?.status ||
    payload?.data?.state ||
    "";
  return String(status || "").toLowerCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callRpc(wallet: ShieldWalletLike, methods: string[], params: any[] = []): Promise<any> {
  if (!wallet.request) return null;
  let lastError: unknown = null;
  for (const method of methods) {
    try {
      return await wallet.request({ method, params });
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

function getPublicKeyString(result: any, wallet: ShieldWalletLike | null): string | null {
  if (typeof result === "string" && result.trim()) {
    return result.trim();
  }
  const fromResult = result?.publicKey || result?.address || result?.account?.publicKey || result?.account?.address;
  const fromWallet = wallet?.publicKey || wallet?.address;
  const value = fromResult || fromWallet;
  return value ? String(value) : null;
}

function getNetworkCandidates(network: WalletAdapterNetwork): string[] {
  if (network === WalletAdapterNetwork.MainnetBeta) {
    return ["mainnet"];
  }
  if (network === WalletAdapterNetwork.TestnetBeta || network === WalletAdapterNetwork.Testnet) {
    return [WalletAdapterNetwork.Testnet, "testnet"];
  }
  return Array.from(new Set([String(network)].filter(Boolean)));
}

function getDecryptPermissionCandidates(decryptPermission: DecryptPermission): string[] {
  const candidates = [String(DecryptPermission.NoDecrypt)];
  if (decryptPermission && decryptPermission !== DecryptPermission.NoDecrypt) {
    candidates.push(String(decryptPermission));
  }
  return Array.from(new Set(candidates.filter(Boolean)));
}

function normalizeDecryptPermission(value: string | null | undefined): DecryptPermission {
  if (value === DecryptPermission.AutoDecrypt) return DecryptPermission.AutoDecrypt;
  if (value === DecryptPermission.OnChainHistory) return DecryptPermission.OnChainHistory;
  if (value === DecryptPermission.UponRequest) return DecryptPermission.UponRequest;
  return DecryptPermission.NoDecrypt;
}

function toUint8Array(value: any): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (value?.signature) return toUint8Array(value.signature);
  if (typeof value === "string") {
    if (/^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0) {
      const bytes = new Uint8Array(value.length / 2);
      for (let i = 0; i < value.length; i += 2) {
        bytes[i / 2] = parseInt(value.slice(i, i + 2), 16);
      }
      return bytes;
    }
    const decoded = atob(value);
    return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  }
  throw new Error("Unsupported signature format");
}

export const ShieldWalletName = "Shield Wallet" as WalletName<"Shield Wallet">;

export class ShieldWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = ShieldWalletName;
  icon = SHIELD_ICON;
  url = "https://aleo.org/shield/";
  readonly supportedTransactionVersions = null;

  private _connecting = false;
  private _wallet: ShieldWalletLike | null = null;
  private _publicKey: string | null = null;
  private _decryptPermission: DecryptPermission = DecryptPermission.NoDecrypt;
  private _readyState: WalletReadyState =
    typeof window === "undefined" || typeof document === "undefined"
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected;

  constructor(_config: ShieldWalletAdapterConfig = {}) {
    super();

    if (this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        if (detectShieldWallet()) {
          this._readyState = WalletReadyState.Installed;
          this.emit("readyStateChange", this._readyState);
          return true;
        }
        return false;
      });
    }
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  get decryptPermission(): string {
    return this._decryptPermission;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  set readyState(readyState: WalletReadyState) {
    this._readyState = readyState;
  }

  private async ensureWallet(): Promise<ShieldWalletLike> {
    const wallet = this._wallet || detectShieldWallet();
    if (!wallet || !this.publicKey) throw new WalletNotConnectedError();
    return wallet;
  }

  private async resolveSubmittedTransactionId(
    wallet: ShieldWalletLike,
    txId: string
  ): Promise<string> {
    const initialTxId = String(txId || "").trim();
    if (!initialTxId) {
      throw new Error("Missing transaction id");
    }
    if (isAleoTxId(initialTxId)) {
      return initialTxId;
    }

    let currentTxId = initialTxId;
    let lastStatus = "pending";
    let lastError: unknown = null;
    const startedAt = Date.now();

    while (Date.now() - startedAt < TX_ID_RESOLVE_TIMEOUT_MS) {
      try {
        let statusResult: any = null;
        if (wallet.transactionStatus) {
          statusResult = await wallet.transactionStatus(currentTxId);
        } else {
          statusResult = await callRpc(wallet, ["transactionStatus", "aleo_transactionStatus"], [
            currentTxId,
          ]);
        }

        const resolvedTxId = extractTransactionId(statusResult);
        if (resolvedTxId) {
          currentTxId = String(resolvedTxId).trim();
        }
        if (isAleoTxId(currentTxId)) {
          return currentTxId;
        }

        const statusText = pickStatusText(statusResult);
        if (statusText) {
          lastStatus = statusText;
        }
        if (statusText && FAILED_STATUS_HINTS.some((hint) => statusText.includes(hint))) {
          throw new Error(`Wallet transaction failed before on-chain id assignment: ${statusText}`);
        }
      } catch (error) {
        lastError = error;
      }

      await sleep(TX_ID_RESOLVE_INTERVAL_MS);
    }

    const lastErrorMessage = lastError
      ? (lastError as any)?.message || String(lastError)
      : "unknown";
    throw new Error(
      `Transaction proving/submission is still pending. Temporary id ${initialTxId} was not resolved to an on-chain at1 id within ${TX_ID_RESOLVE_TIMEOUT_MS}ms (last status: ${lastStatus}; last error: ${lastErrorMessage})`
    );
  }

  async decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number
  ): Promise<string> {
    try {
      const wallet = await this.ensureWallet();
      if (this._decryptPermission === DecryptPermission.NoDecrypt) {
        throw new WalletDecryptionNotAllowedError();
      }
      try {
        if (wallet.decrypt) {
          const result = await wallet.decrypt(cipherText, tpk, programId, functionName, index);
          return typeof result === "string" ? result : result?.text;
        }
        const fallback = await callRpc(wallet, ["decrypt", "aleo_decrypt"], [
          cipherText,
          tpk,
          programId,
          functionName,
          index,
        ]);
        return typeof fallback === "string" ? fallback : fallback?.text;
      } catch (error: any) {
        throw new WalletDecryptionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async requestRecords(program: string): Promise<any[]> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.requestRecords) {
          const result = await wallet.requestRecords(program);
          return result?.records || [];
        }
        const fallback = await callRpc(wallet, ["requestRecords", "aleo_requestRecords"], [program]);
        return fallback?.records || fallback || [];
      } catch (error: any) {
        throw new WalletRecordsError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async requestRecordPlaintexts(program: string): Promise<any[]> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.requestRecordPlaintexts) {
          const result = await wallet.requestRecordPlaintexts(program);
          return result?.records || [];
        }
        const fallback = await callRpc(wallet, ["requestRecordPlaintexts"], [program]);
        return fallback?.records || fallback || [];
      } catch (error: any) {
        throw new WalletRecordsError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async requestTransaction(transaction: AleoTransaction): Promise<string> {
    try {
      const wallet = await this.ensureWallet();
      try {
        const shieldPayload = toShieldExecutionPayload(transaction);
        if (wallet.requestTransaction) {
          let result: any;
          try {
            result = await wallet.requestTransaction(shieldPayload);
          } catch (error) {
            if (isUserRejectedError(error)) throw error;
            result = await wallet.requestTransaction(transaction);
          }
          const txId = extractTransactionId(result);
          if (!txId) throw new Error(`Missing transaction id; wallet returned: ${serializeDebugValue(result)}`);
          return await this.resolveSubmittedTransactionId(wallet, txId);
        }
        if (wallet.executeTransaction) {
          let result: any;
          try {
            result = await wallet.executeTransaction(shieldPayload);
          } catch (error) {
            if (isUserRejectedError(error)) throw error;
            result = await wallet.executeTransaction(transaction);
          }
          const txId = extractTransactionId(result);
          if (!txId) throw new Error(`Missing transaction id; wallet returned: ${serializeDebugValue(result)}`);
          return await this.resolveSubmittedTransactionId(wallet, txId);
        }
        let fallback: any;
        try {
          fallback = await callRpc(
            wallet,
            [
              "requestTransaction",
              "executeTransaction",
              "aleo_requestTransaction",
              "aleo_executeTransaction",
            ],
            [shieldPayload]
          );
        } catch (error) {
          if (isUserRejectedError(error)) throw error;
          fallback = await callRpc(
            wallet,
            [
              "requestTransaction",
              "executeTransaction",
              "aleo_requestTransaction",
              "aleo_executeTransaction",
            ],
            [transaction]
          );
        }
        const txId = extractTransactionId(fallback);
        if (!txId) throw new Error(`Missing transaction id; wallet returned: ${serializeDebugValue(fallback)}`);
        return await this.resolveSubmittedTransactionId(wallet, txId);
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async requestExecution(transaction: AleoTransaction): Promise<string> {
    try {
      const wallet = await this.ensureWallet();
      try {
        const shieldPayload = toShieldExecutionPayload(transaction);
        if (wallet.requestExecution) {
          let result: any;
          try {
            result = await wallet.requestExecution(shieldPayload);
          } catch (error) {
            if (isUserRejectedError(error)) throw error;
            result = await wallet.requestExecution(transaction);
          }
          const txId = extractTransactionId(result);
          if (!txId) throw new Error("Missing execution transaction id");
          return await this.resolveSubmittedTransactionId(wallet, txId);
        }
        if (wallet.executeTransaction) {
          let result: any;
          try {
            result = await wallet.executeTransaction(shieldPayload);
          } catch (error) {
            if (isUserRejectedError(error)) throw error;
            result = await wallet.executeTransaction(transaction);
          }
          const txId = extractTransactionId(result);
          if (!txId) throw new Error("Missing execution transaction id");
          return await this.resolveSubmittedTransactionId(wallet, txId);
        }
        let fallback: any;
        try {
          fallback = await callRpc(
            wallet,
            [
              "requestExecution",
              "executeTransaction",
              "aleo_requestExecution",
              "aleo_executeTransaction",
            ],
            [shieldPayload]
          );
        } catch (error) {
          if (isUserRejectedError(error)) throw error;
          fallback = await callRpc(
            wallet,
            [
              "requestExecution",
              "executeTransaction",
              "aleo_requestExecution",
              "aleo_executeTransaction",
            ],
            [transaction]
          );
        }
        const txId = extractTransactionId(fallback);
        if (!txId) throw new Error("Missing execution transaction id");
        return await this.resolveSubmittedTransactionId(wallet, txId);
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async requestBulkTransactions(transactions: AleoTransaction[]): Promise<string[]> {
    try {
      const wallet = await this.ensureWallet();
      try {
        const shieldPayloads = transactions.map((tx) => toShieldExecutionPayload(tx));
        if (wallet.requestBulkTransactions) {
          let result: any;
          try {
            result = await wallet.requestBulkTransactions(shieldPayloads);
          } catch (error) {
            if (isUserRejectedError(error)) throw error;
            result = await wallet.requestBulkTransactions(transactions);
          }
          const rawIds = result?.transactionIds || [];
          if (!Array.isArray(rawIds)) return [];
          return await Promise.all(
            rawIds
              .map((id: any) => String(id || "").trim())
              .filter(Boolean)
              .map((id: string) => this.resolveSubmittedTransactionId(wallet, id))
          );
        }
        let fallback: any;
        try {
          fallback = await callRpc(wallet, ["requestBulkTransactions"], [shieldPayloads]);
        } catch (error) {
          if (isUserRejectedError(error)) throw error;
          fallback = await callRpc(wallet, ["requestBulkTransactions"], [transactions]);
        }
        const rawIds = fallback?.transactionIds || fallback || [];
        if (!Array.isArray(rawIds)) return [];
        return await Promise.all(
          rawIds
            .map((id: any) => String(id || "").trim())
            .filter(Boolean)
            .map((id: string) => this.resolveSubmittedTransactionId(wallet, id))
        );
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async requestDeploy(deployment: AleoDeployment): Promise<string> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.requestDeploy) {
          const result = await wallet.requestDeploy(deployment);
          const txId = extractTransactionId(result);
          if (!txId) throw new Error("Missing deployment transaction id");
          return await this.resolveSubmittedTransactionId(wallet, txId);
        }
        if (wallet.executeDeployment) {
          const result = await wallet.executeDeployment(deployment);
          const txId = extractTransactionId(result);
          if (!txId) throw new Error("Missing deployment transaction id");
          return await this.resolveSubmittedTransactionId(wallet, txId);
        }
        const fallback = await callRpc(
          wallet,
          [
            "requestDeploy",
            "executeDeployment",
            "aleo_requestDeploy",
            "aleo_executeDeployment",
          ],
          [deployment]
        );
        const txId = extractTransactionId(fallback);
        if (!txId) throw new Error("Missing deployment transaction id");
        return await this.resolveSubmittedTransactionId(wallet, txId);
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async requestTransactionHistory(program: string): Promise<any[]> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.requestTransactionHistory) {
          const result = await wallet.requestTransactionHistory(program);
          return result?.transactions || [];
        }
        const fallback = await callRpc(wallet, ["requestTransactionHistory"], [program]);
        return fallback?.transactions || fallback || [];
      } catch (error: any) {
        throw new WalletRecordsError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async transactionStatus(transactionId: string): Promise<string> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.transactionStatus) {
          const result = await wallet.transactionStatus(transactionId);
          return String(result?.status || "unknown");
        }
        const fallback = await callRpc(wallet, ["transactionStatus", "aleo_transactionStatus"], [
          transactionId,
        ]);
        return String(fallback?.status || fallback || "unknown");
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async transitionViewKeys(transactionId: string): Promise<string[]> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.transitionViewKeys) {
          const result = await wallet.transitionViewKeys(transactionId);
          return result?.viewKeys || [];
        }
        const fallback = await callRpc(wallet, ["transitionViewKeys"], [transactionId]);
        return fallback?.viewKeys || fallback || [];
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async getExecution(transactionId: string): Promise<string> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.getExecution) {
          const result = await wallet.getExecution(transactionId);
          return String(result?.execution || "");
        }
        const fallback = await callRpc(wallet, ["getExecution", "aleo_getExecution"], [transactionId]);
        return String(fallback?.execution || fallback || "");
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }

  async connect(
    decryptPermission: DecryptPermission,
    network: WalletAdapterNetwork,
    programs?: string[]
  ): Promise<void> {
    try {
      if (this.connecting) return;
      if (this._readyState !== WalletReadyState.Installed) {
        throw new WalletNotReadyError();
      }

      this._connecting = true;
      const wallet = detectShieldWallet();
      if (!wallet) {
        throw new WalletConnectionError("Shield wallet not detected");
      }

      const isAvailable = wallet.isAvailable ? await wallet.isAvailable() : true;
      if (!isAvailable) {
        throw new WalletConnectionError("Shield wallet is not available");
      }

      let connectResult: any = null;
      const requestedPrograms = programs && programs.length > 0 ? programs : [];
      const networkCandidates = getNetworkCandidates(network);
      const decryptPermissionCandidates = getDecryptPermissionCandidates(decryptPermission);
      let lastConnectError: unknown = null;
      let connectedDecryptPermission: string | null = null;

      if (wallet.connect) {
        const connectArity = wallet.connect.length;
        const connectAttempts: Array<{
          run: () => Promise<any>;
          decryptPermission: string;
        }> = [];

        for (const networkCandidate of networkCandidates) {
          for (const decryptPermissionCandidate of decryptPermissionCandidates) {
            connectAttempts.push({
              run: () =>
                wallet.connect!(networkCandidate, decryptPermissionCandidate, requestedPrograms),
              decryptPermission: decryptPermissionCandidate,
            });
            connectAttempts.push({
              run: () => wallet.connect!(networkCandidate, decryptPermissionCandidate),
              decryptPermission: decryptPermissionCandidate,
            });
          }
        }

        // Some injected providers expose connect(payload) with decrypt permission/program scope only.
        // Do not include network in payload to avoid "Invalid connect payload" on Shield 1.13.x.
        if (connectArity <= 1) {
          for (const decryptPermissionCandidate of decryptPermissionCandidates) {
            connectAttempts.push({
              run: () =>
                wallet.connect!({
                  decryptPermission: decryptPermissionCandidate,
                  programs: requestedPrograms,
                }),
              decryptPermission: decryptPermissionCandidate,
            });
            connectAttempts.push({
              run: () =>
                wallet.connect!({
                  decryptPermission: decryptPermissionCandidate,
                }),
              decryptPermission: decryptPermissionCandidate,
            });
            connectAttempts.push({
              run: () =>
                wallet.connect!({
                  decrypt_permission: decryptPermissionCandidate,
                  programs: requestedPrograms,
                }),
              decryptPermission: decryptPermissionCandidate,
            });
            connectAttempts.push({
              run: () =>
                wallet.connect!({
                  decrypt_permission: decryptPermissionCandidate,
                }),
              decryptPermission: decryptPermissionCandidate,
            });
          }
        }
        if (connectArity === 0) {
          connectAttempts.push({
            run: () => wallet.connect!(),
            decryptPermission: DecryptPermission.NoDecrypt,
          });
        }

        let connected = false;
        for (const attemptConnect of connectAttempts) {
          try {
            connectResult = await attemptConnect.run();
            connectedDecryptPermission = attemptConnect.decryptPermission;
            connected = true;
            break;
          } catch (error) {
            lastConnectError = error;
          }
        }

        if (!connected) {
          throw new WalletConnectionError(
            (lastConnectError as any)?.message || "Failed to connect to Shield wallet",
            lastConnectError as any
          );
        }
      } else {
        const rpcParamsList: Array<{ params: any[]; decryptPermission: string }> = [];
        for (const networkCandidate of networkCandidates) {
          for (const decryptPermissionCandidate of decryptPermissionCandidates) {
            rpcParamsList.push({
              params: [networkCandidate, decryptPermissionCandidate, requestedPrograms],
              decryptPermission: decryptPermissionCandidate,
            });
            rpcParamsList.push({
              params: [networkCandidate, decryptPermissionCandidate],
              decryptPermission: decryptPermissionCandidate,
            });
          }
        }
        for (const decryptPermissionCandidate of decryptPermissionCandidates) {
          rpcParamsList.push({
            params: [{ decryptPermission: decryptPermissionCandidate, programs: requestedPrograms }],
            decryptPermission: decryptPermissionCandidate,
          });
          rpcParamsList.push({
            params: [{ decrypt_permission: decryptPermissionCandidate, programs: requestedPrograms }],
            decryptPermission: decryptPermissionCandidate,
          });
        }

        let connected = false;
        for (const entry of rpcParamsList) {
          try {
            connectResult = await callRpc(wallet, ["connect", "aleo_connect"], entry.params);
            connectedDecryptPermission = entry.decryptPermission;
            connected = true;
            break;
          } catch (error) {
            lastConnectError = error;
          }
        }
        if (!connected) {
          throw new WalletConnectionError(
            (lastConnectError as any)?.message || "Failed to connect to Shield wallet via RPC",
            lastConnectError as any
          );
        }
      }

      this._publicKey = getPublicKeyString(connectResult, wallet);
      if (!this._publicKey) {
        try {
          const accountResult = await callRpc(
            wallet,
            [
              "account",
              "getAccount",
              "aleo_account",
              "getSelectedAccount",
              "selectedAccount",
              "getAddress",
              "aleo_getAddress",
            ],
            []
          );
          this._publicKey = getPublicKeyString(accountResult, wallet);
        } catch {
          // Ignore and fallback to delayed wallet field read.
        }
      }
      if (!this._publicKey) {
        await new Promise((resolve) => setTimeout(resolve, 120));
        this._publicKey = getPublicKeyString(null, wallet);
      }
      if (!this._publicKey) {
        throw new WalletConnectionError("Connected but missing public key/address");
      }

      this._wallet = wallet;
      this._decryptPermission = normalizeDecryptPermission(connectedDecryptPermission);
      this.emit("connect", this._publicKey);
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet;
    this._wallet = null;
    this._publicKey = null;

    if (wallet?.disconnect) {
      try {
        await wallet.disconnect();
      } catch (error: any) {
        this.emit("error", new WalletDisconnectionError(error?.message, error));
      }
    }
    this.emit("disconnect");
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      const wallet = await this.ensureWallet();
      try {
        if (wallet.signMessage) {
          const result = await wallet.signMessage(message);
          return toUint8Array(result);
        }
        const fallback = await callRpc(wallet, ["signMessage", "aleo_signMessage"], [Array.from(message)]);
        return toUint8Array(fallback);
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error);
      }
    } catch (error) {
      this.emit("error", error as any);
      throw error;
    }
  }
}
