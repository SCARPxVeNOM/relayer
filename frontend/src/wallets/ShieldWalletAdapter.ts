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
  decrypt?: (
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number
  ) => Promise<any>;
  requestRecords?: (program: string) => Promise<any>;
  requestRecordPlaintexts?: (program: string) => Promise<any>;
  requestTransaction?: (transaction: AleoTransaction) => Promise<any>;
  requestExecution?: (transaction: AleoTransaction) => Promise<any>;
  requestBulkTransactions?: (transactions: AleoTransaction[]) => Promise<any>;
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
    w.shieldWallet ||
    w.shield ||
    w.aleo?.shieldWallet ||
    w.aleo?.shield ||
    w.aleo?.providers?.shield ||
    null
  );
}

function extractTransactionId(result: any): string {
  return (
    result?.transactionId ||
    result?.txId ||
    result?.tx_id ||
    result?.id ||
    result?.hash ||
    ""
  );
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
  const fromResult = result?.publicKey || result?.address || result?.account?.publicKey || result?.account?.address;
  const fromWallet = wallet?.publicKey || wallet?.address;
  const value = fromResult || fromWallet;
  return value ? String(value) : null;
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
        if (wallet.requestTransaction) {
          const result = await wallet.requestTransaction(transaction);
          const txId = extractTransactionId(result);
          if (!txId) throw new Error("Missing transaction id");
          return txId;
        }
        const fallback = await callRpc(wallet, ["requestTransaction", "aleo_requestTransaction"], [
          transaction,
        ]);
        const txId = extractTransactionId(fallback);
        if (!txId) throw new Error("Missing transaction id");
        return txId;
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
        if (wallet.requestExecution) {
          const result = await wallet.requestExecution(transaction);
          const txId = extractTransactionId(result);
          if (!txId) throw new Error("Missing execution transaction id");
          return txId;
        }
        const fallback = await callRpc(wallet, ["requestExecution", "aleo_requestExecution"], [
          transaction,
        ]);
        const txId = extractTransactionId(fallback);
        if (!txId) throw new Error("Missing execution transaction id");
        return txId;
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
        if (wallet.requestBulkTransactions) {
          const result = await wallet.requestBulkTransactions(transactions);
          return result?.transactionIds || [];
        }
        const fallback = await callRpc(wallet, ["requestBulkTransactions"], [transactions]);
        return fallback?.transactionIds || fallback || [];
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
          return txId;
        }
        const fallback = await callRpc(wallet, ["requestDeploy", "aleo_requestDeploy"], [deployment]);
        const txId = extractTransactionId(fallback);
        if (!txId) throw new Error("Missing deployment transaction id");
        return txId;
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
      if (this.connected || this.connecting) return;
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
      if (wallet.connect) {
        try {
          connectResult = await wallet.connect(decryptPermission, network, programs);
        } catch {
          try {
            connectResult = await wallet.connect({
              decryptPermission,
              network,
              programs: programs || [],
            });
          } catch {
            connectResult = await wallet.connect();
          }
        }
      } else {
        connectResult = await callRpc(wallet, ["connect", "aleo_connect"], [
          decryptPermission,
          network,
          programs || [],
        ]);
      }

      this._publicKey = getPublicKeyString(connectResult, wallet);
      if (!this._publicKey) {
        const accountResult = await callRpc(wallet, ["account", "getAccount", "aleo_account"], []);
        this._publicKey = getPublicKeyString(accountResult, wallet);
      }
      if (!this._publicKey) {
        throw new WalletConnectionError("Connected but missing public key/address");
      }

      this._wallet = wallet;
      this._decryptPermission = decryptPermission;
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
