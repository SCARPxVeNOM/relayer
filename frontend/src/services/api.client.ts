const API_BASE_URL =
  process.env.NEXT_PUBLIC_RELAYER_API_URL || "http://localhost:3001";

export interface HealthResponse {
  status: string;
  timestamp?: string;
  uptimeSec?: number;
  service?: string;
}

export interface OtpSendResponse {
  success: boolean;
  challengeId: string;
  phone: string;
  channel: "whatsapp";
  provider: string;
  expiresInSec: number;
}

export interface OtpVerifyResponse {
  success: boolean;
  token: string;
  expiresAt: number;
  user: {
    id: number;
    phone: string;
    walletAddress: string;
    username?: string | null;
    displayName?: string | null;
    usernameClaimTxId?: string | null;
    usernameClaimedAt?: number | null;
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
    username?: string | null;
    displayName?: string | null;
    usernameClaimTxId?: string | null;
    usernameClaimedAt?: number | null;
  };
  wallet: {
    address: string;
    createdNow: boolean;
  };
}

export interface PasskeyRegisterOptionsResponse {
  success: boolean;
  challengeId: string;
  username: string;
  options: any;
}

export interface PasskeyLoginOptionsResponse {
  success: boolean;
  challengeId: string;
  username?: string;
  options: any;
}

export interface PasskeyVerifyResponse {
  success: boolean;
  token: string;
  expiresAt: number;
  authMethod: "passkey";
  user: {
    id: number;
    phone: string;
    walletAddress: string;
    username?: string | null;
    displayName?: string | null;
    usernameClaimTxId?: string | null;
    usernameClaimedAt?: number | null;
  };
  wallet: {
    address: string;
    createdNow: boolean;
  };
}

export interface MeResponse {
  success: boolean;
  user: {
    id: number;
    phone: string;
    walletAddress: string;
    username?: string | null;
    displayName?: string | null;
    usernameClaimTxId?: string | null;
    usernameClaimedAt?: number | null;
  };
}

export interface ProfileUpsertResponse {
  success: boolean;
  user: {
    id: number;
    phone: string;
    walletAddress: string;
    username?: string | null;
    displayName?: string | null;
    usernameClaimTxId?: string | null;
    usernameClaimedAt?: number | null;
  };
  claim?: {
    txId: string;
    programId: string;
    functionName: string;
    feePayerAddress: string;
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

  async createPasskeyRegistrationOptions(input: {
    username: string;
    displayName?: string;
    origin?: string;
    rpId?: string;
  }): Promise<PasskeyRegisterOptionsResponse> {
    return this.request<PasskeyRegisterOptionsResponse>("/api/auth/passkey/register/options", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async verifyPasskeyRegistration(input: {
    challengeId: string;
    username: string;
    pin: string;
    credential: unknown;
    origin?: string;
    rpId?: string;
  }): Promise<PasskeyVerifyResponse> {
    return this.request<PasskeyVerifyResponse>("/api/auth/passkey/register/verify", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createPasskeyLoginOptions(input: {
    username?: string;
    origin?: string;
    rpId?: string;
  }): Promise<PasskeyLoginOptionsResponse> {
    return this.request<PasskeyLoginOptionsResponse>("/api/auth/passkey/login/options", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async verifyPasskeyLogin(input: {
    challengeId: string;
    username?: string;
    credential: unknown;
    origin?: string;
    rpId?: string;
  }): Promise<PasskeyVerifyResponse> {
    return this.request<PasskeyVerifyResponse>("/api/auth/passkey/login/verify", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getMe(token: string): Promise<MeResponse> {
    return this.request<MeResponse>("/api/me", { method: "GET" }, token);
  }

  async upsertProfile(
    token: string,
    input: { username: string; displayName?: string; usernameClaimTxId: string }
  ): Promise<ProfileUpsertResponse> {
    return this.request<ProfileUpsertResponse>(
      "/api/me/profile",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      token
    );
  }

  async getTokens(): Promise<{ success: boolean; tokens: TokenMetadata[] }> {
    return this.request("/api/assets/tokens", { method: "GET" });
  }

  async getBalances(token: string): Promise<{
    success: boolean;
    balances: BalanceItem[];
    ledgerMode?: "onchain_canonical" | "backend_simulated";
    note?: string;
  }> {
    return this.request("/api/assets/balances", { method: "GET" }, token);
  }

  async getActivity(token: string): Promise<any> {
    return this.request("/api/assets/activity", { method: "GET" }, token);
  }

  async resolveRecipientByPhone(
    token: string,
    phone: string
  ): Promise<{
    success: boolean;
    phone: string;
    username?: string | null;
    displayName?: string | null;
    walletAddress: string;
    userId: number | null;
  }> {
    const query = encodeURIComponent(phone);
    return this.request(`/api/contacts/resolve?phone=${query}`, { method: "GET" }, token);
  }

  async resolveRecipientByUsername(
    token: string,
    username: string
  ): Promise<{
    success: boolean;
    username: string;
    displayName?: string | null;
    walletAddress: string;
    userId: number | null;
    source?: "onchain_claim" | "legacy_user_db";
  }> {
    const query = encodeURIComponent(username);
    return this.request(`/api/contacts/resolve?username=${query}`, { method: "GET" }, token);
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
    input: { quoteId: string; aleoTxId?: string; aleoTxIds?: string[] }
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
