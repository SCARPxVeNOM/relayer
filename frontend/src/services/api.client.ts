/**
 * API Client - Backend Communication
 * 
 * This client handles ALL communication with the relayer backend.
 * Frontend NEVER sends EVM transactions directly - only creates Aleo intents.
 */

import { config } from '@/config';

const API_BASE_URL = process.env.NEXT_PUBLIC_RELAYER_API_URL || 'http://localhost:3001';

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
}

export interface TelemetryResponse {
  bridgeLink: 'STABLE' | 'DEGRADED';
  encryptionEngine: 'LOCKED' | 'UNLOCKED';
  networkOrientation: number[];
  zkSystemStatus: string;
}

export interface MetricsResponse {
  queues: Record<string, number>;
  wallets: {
    eth: { count: number; statuses: any[] };
    polygon: { count: number; statuses: any[] };
  };
  queueMetrics: Record<string, any>;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

export interface RelayerStatus {
  chainId: number;
  address: string;
  isAvailable: boolean;
  pendingCount: number;
}

export interface IntentRequest {
  chainId: number;
  amount: string;
  recipient: string;
}

export interface IntentResponse {
  requestId: string;
  status: 'pending';
}

export interface SessionInitResponse {
  sessionId: string;
  active: boolean;
}

class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * GET /api/health
   * System health check
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * GET /api/telemetry
   * Read-only system telemetry
   */
  async getTelemetry(): Promise<TelemetryResponse> {
    const response = await fetch(`${this.baseUrl}/api/telemetry`);
    if (!response.ok) {
      throw new Error(`Telemetry fetch failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * GET /api/metrics
   * Read-only system metrics
   */
  async getMetrics(): Promise<MetricsResponse> {
    const response = await fetch(`${this.baseUrl}/metrics`);
    if (!response.ok) {
      throw new Error(`Metrics fetch failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * GET /api/relayers
   * Read-only relayer status
   */
  async getRelayers(): Promise<RelayerStatus[]> {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error(`Relayers fetch failed: ${response.statusText}`);
    }
    const data = await response.json();
    // Extract relayer statuses from response
    const relayers: RelayerStatus[] = [];
    
    if (data.wallets?.eth?.statuses) {
      data.wallets.eth.statuses.forEach((s: any) => {
        relayers.push({
          chainId: 11155111,
          address: s.address,
          isAvailable: s.isAvailable,
          pendingCount: s.pendingCount || 0,
        });
      });
    }
    
    if (data.wallets?.polygon?.statuses) {
      data.wallets.polygon.statuses.forEach((s: any) => {
        relayers.push({
          chainId: 80002,
          address: s.address,
          isAvailable: s.isAvailable,
          pendingCount: s.pendingCount || 0,
        });
      });
    }
    
    return relayers;
  }

  /**
   * POST /api/session/init
   * Initialize control session (no blockchain action)
   */
  async initSession(): Promise<SessionInitResponse> {
    const response = await fetch(`${this.baseUrl}/api/session/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Session init failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * POST /api/intent
   * Create private intent (Aleo transaction)
   * 
   * This is the ONLY way frontend creates execution intent.
   * Backend handles all EVM transactions.
   */
  async createIntent(intent: IntentRequest): Promise<IntentResponse> {
    const response = await fetch(`${this.baseUrl}/api/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(intent),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Intent creation failed: ${error.message || response.statusText}`);
    }
    
    return response.json();
  }
}

export const apiClient = new APIClient();

