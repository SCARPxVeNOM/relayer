const API_BASE_URL =
  process.env.NEXT_PUBLIC_RELAYER_API_URL || "http://localhost:3001";

export interface HealthResponse {
  status: string;
  timestamp?: string;
  uptimeSec?: number;
  service?: string;
}

export interface SessionInitResponse {
  sessionId: string;
  active: boolean;
}

export interface OtpSendResponse {
  success: boolean;
  challengeId: string;
  phone: string;
  channel: "whatsapp";
  provider: string;
  expiresInSec: number;
  devCode?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  token: string;
  expiresAt: number;
  user: {
    id: number;
    phone: string;
    walletAddress: string;
  };
  wallet: {
    address: string;
    createdNow: boolean;
  };
}

export interface WalletAuthChallengeResponse {
  success: boolean;
  challengeId: string;
  message: string;
  nonce: string;
  expiresAt: number;
  expiresInSec: number;
}

export interface WalletAuthVerifyResponse {
  success: boolean;
  token: string;
  expiresAt: number;
  authMethod: "wallet";
  signatureVerified: boolean;
  warning?: string;
  user: {
    id: number;
    phone: string;
    walletAddress: string;
  };
  wallet: {
    address: string;
    createdNow: boolean;
  };
}

export interface TokenMetadata {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  standard: string;
}

export interface BalanceItem {
  tokenId: string;
  symbol: string;
  name: string;
  decimals: number;
  standard: string;
  amountAtomic: string;
  amount: string;
}

export interface RelaySubmission {
  id: string;
  user_id: number;
  client_tx_id: string | null;
  serialized_length: number;
  aleo_tx_id: string | null;
  status: string;
  mode: string;
  response_json: string | null;
  created_at: number;
}

export type YieldActionType = "stake" | "unstake" | "claim" | "rebalance";

export interface YieldTransition {
  programId: string;
  functionName: string;
  inputs: string[];
}

export interface YieldPlanStep {
  type: "stake" | "unstake" | "claim";
  assetId: string;
  tokenId: string;
  rewardTokenId: string;
  amountAtomic: string;
  minOutAtomic?: string;
  apyBps?: number;
  riskLevel?: string;
  exitFeeBps?: number;
}

export interface YieldPlan {
  action: YieldActionType;
  tokenId?: string;
  steps: YieldPlanStep[];
  transitions: YieldTransition[];
}

export interface YieldAssetPositionView {
  stakedAtomic: string;
  unclaimedAtomic: string;
  projectedYearlyRewardAtomic: string;
}

export interface YieldAsset {
  id: string;
  name: string;
  protocol: string;
  strategyType: string;
  riskLevel: string;
  tokenId: string;
  tokenSymbol: string;
  rewardTokenId: string;
  rewardTokenSymbol: string;
  apyBps: number;
  minApyBps: number;
  maxApyBps: number;
  lockupDays: number;
  exitFeeBps: number;
  capacityAtomic: string;
  position: YieldAssetPositionView;
}

export interface YieldQuote {
  id: string;
  action: YieldActionType;
  expiresAt: number;
  createdAt: number;
  plan: YieldPlan;
}

export interface YieldHistoryQuote {
  id: string;
  action: YieldActionType;
  intent: Record<string, unknown>;
  plan: YieldPlan;
  expiresAt: number;
  createdAt: number;
}

export interface YieldHistoryAction {
  id: string;
  quoteId: string | null;
  action: YieldActionType;
  status: string;
  aleoTxId: string | null;
  plan: YieldPlan;
  createdAt: number;
}

export interface YieldPositionRow {
  userId: number;
  assetId: string;
  tokenId: string;
  rewardTokenId: string;
  stakedAtomic: string;
  unclaimedAtomic: string;
  lastAccrualAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface YieldAssetsResponse {
  success: boolean;
  assets: YieldAsset[];
  positions: YieldPositionRow[];
  quotes: YieldHistoryQuote[];
  actions: YieldHistoryAction[];
}

export interface YieldSolveResponse {
  success: boolean;
  action: YieldHistoryAction;
  plan: YieldPlan;
  positions: YieldPositionRow[];
  balances: BalanceItem[];
}

class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    token?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options.headers && typeof options.headers === "object" && !Array.isArray(options.headers)) {
      Object.assign(headers, options.headers as Record<string, string>);
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        data?.error || data?.message || `${response.status} ${response.statusText}`;
      throw new Error(message);
    }
    return data;
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health", { method: "GET" });
  }

  async getTelemetry(): Promise<any> {
    return this.request("/api/telemetry", { method: "GET" });
  }

  async getLatency(_scope?: string): Promise<any> {
    return this.request("/api/latency", { method: "GET" });
  }

  async getHeartbeat(): Promise<any> {
    return this.request("/api/heartbeat", { method: "GET" });
  }

  async getChains(): Promise<any> {
    return this.request("/api/chains", { method: "GET" });
  }

  async getAleoStatus(): Promise<any> {
    return this.request("/api/aleo/status", { method: "GET" });
  }

  async getVersion(): Promise<any> {
    return this.request("/api/version", { method: "GET" });
  }

  async getRelayerInfo(): Promise<any> {
    return this.request("/api/relayers", { method: "GET" });
  }

  // Legacy helper kept so older components compile.
  async initSession(): Promise<SessionInitResponse> {
    return {
      sessionId: `legacy_${Date.now()}`,
      active: true,
    };
  }

  async sendWhatsappOtp(phone: string): Promise<OtpSendResponse> {
    return this.request<OtpSendResponse>("/api/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async verifyWhatsappOtp(input: {
    phone: string;
    challengeId: string;
    code: string;
    pin: string;
  }): Promise<OtpVerifyResponse> {
    return this.request<OtpVerifyResponse>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createWalletAuthChallenge(address?: string): Promise<WalletAuthChallengeResponse> {
    return this.request<WalletAuthChallengeResponse>("/api/auth/wallet/challenge", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  async verifyWalletAuth(input: {
    challengeId: string;
    address: string;
    signature?: string;
    signatureBase64?: string;
  }): Promise<WalletAuthVerifyResponse> {
    return this.request<WalletAuthVerifyResponse>("/api/auth/wallet/verify", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getMe(token: string): Promise<any> {
    return this.request("/api/me", { method: "GET" }, token);
  }

  async getTokens(): Promise<{ success: boolean; tokens: TokenMetadata[] }> {
    return this.request("/api/assets/tokens", { method: "GET" });
  }

  async getBalances(token: string): Promise<{ success: boolean; balances: BalanceItem[] }> {
    return this.request("/api/assets/balances", { method: "GET" }, token);
  }

  async getActivity(token: string): Promise<any> {
    return this.request("/api/assets/activity", { method: "GET" }, token);
  }

  async getSwapQuote(
    token: string,
    input: { tokenIn: string; tokenOut: string; amount: string }
  ): Promise<any> {
    return this.request(
      "/api/swap/quote",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async executeSwap(
    token: string,
    input: { quoteId: string; maxSlippageBps?: number; aleoTxId?: string }
  ): Promise<any> {
    return this.request(
      "/api/swap/execute",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async listSwaps(token: string): Promise<any> {
    return this.request("/api/swaps", { method: "GET" }, token);
  }

  async getYieldAssets(token: string, tokenId?: string): Promise<YieldAssetsResponse> {
    const suffix = tokenId ? `?tokenId=${encodeURIComponent(tokenId)}` : "";
    return this.request(`/api/yield/get_assets${suffix}`, { method: "GET" }, token);
  }

  async getYieldQuote(
    token: string,
    input:
      | {
          action: "stake" | "unstake";
          assetId: string;
          amount: string;
        }
      | {
          action: "claim";
          assetId?: string;
        }
      | {
          action: "rebalance";
          targetWeights: Record<string, number>;
        }
  ): Promise<{ success: boolean; quote: YieldQuote }> {
    return this.request(
      "/api/yield/get_quote",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async solveYieldQuote(
    token: string,
    input: { quoteId: string; aleoTxId?: string }
  ): Promise<YieldSolveResponse> {
    return this.request(
      "/api/yield/solve",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async listYieldQuotes(token: string, limit = 20): Promise<{ success: boolean; quotes: YieldHistoryQuote[] }> {
    return this.request(`/api/yield/quotes?limit=${Math.max(1, Math.floor(limit))}`, { method: "GET" }, token);
  }

  async listYieldActions(token: string, limit = 30): Promise<{ success: boolean; actions: YieldHistoryAction[] }> {
    return this.request(`/api/yield/actions?limit=${Math.max(1, Math.floor(limit))}`, { method: "GET" }, token);
  }

  async sendPayment(token: string, input: any): Promise<any> {
    return this.request(
      "/api/payments/send",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async listPayments(token: string): Promise<any> {
    return this.request("/api/payments", { method: "GET" }, token);
  }

  async createInvoice(token: string, input: any): Promise<any> {
    return this.request(
      "/api/invoices",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async listInvoices(token: string): Promise<any> {
    return this.request("/api/invoices", { method: "GET" }, token);
  }

  async payInvoice(token: string, invoiceId: string, aleoTxId?: string): Promise<any> {
    return this.request(
      `/api/invoices/${invoiceId}/pay`,
      {
        method: "POST",
        body: JSON.stringify({ aleoTxId }),
      },
      token
    );
  }

  async submitRelayTx(
    token: string,
    input: { serializedTransaction?: string; aleoTxId?: string; clientTxId?: string }
  ): Promise<any> {
    return this.request(
      "/api/relay/submit",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async listRelaySubmissions(token: string): Promise<any> {
    return this.request("/api/relay/submissions", { method: "GET" }, token);
  }

  async getRelayStatus(token: string, txId: string): Promise<any> {
    return this.request(`/api/relay/status/${txId}`, { method: "GET" }, token);
  }
}

export const apiClient = new APIClient();
