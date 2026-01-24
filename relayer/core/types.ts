/**
 * Core Types for Relayer System
 */

export interface TransferIntent {
  requestId: string;
  chainId: number;
  amount: string;
  recipient: string;
}

export interface Batch {
  id: string;
  chainId: number;
  intents: TransferIntent[];
  createdAt: number;
  readyAt: number;
}

export interface ExecutionResult {
  requestId: string;
  success: boolean;
  txHash?: string;
  error?: string;
  walletAddress?: string;
}

export interface WalletStatus {
  address: string;
  chainId: number;
  isAvailable: boolean;
  pendingCount: number;
  lastUsedAt: number;
}

export interface QueueMetrics {
  queueDepth: number; // λ - arrival rate
  executionRate: number; // μ - service rate
  walletCount: number; // k - number of wallets
  throughput: number; // T = min(λ, k × μ)
  waitTime: number; // Expected wait time
  stability: boolean; // λ < k × μ
}

