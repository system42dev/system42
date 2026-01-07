import type { SystemState } from "@shared/types";

interface NetworkMetrics {
  slotHeight: number;
  blockTime: number;
  tps: number;
  validatorCount: number;
  skipRate: number;
}

interface MonitorConfig {
  pollingInterval: number;
  rpcEndpoint: string;
  maxRetries: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: MonitorConfig = {
  pollingInterval: 5000,
  rpcEndpoint: "https://api.mainnet-beta.solana.com",
  maxRetries: 3,
  timeoutMs: 10000,
};

export class NetworkMonitor {
  private config: MonitorConfig;
  private metrics: NetworkMetrics | null = null;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<(metrics: NetworkMetrics) => void> = new Set();

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async fetchCurrentSlot(): Promise<number> {
    const response = await fetch(this.config.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSlot",
      }),
    });

    const data = await response.json();
    return data.result;
  }

  async fetchBlockTime(slot: number): Promise<number | null> {
    const response = await fetch(this.config.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBlockTime",
        params: [slot],
      }),
    });

    const data = await response.json();
    return data.result;
  }

  async fetchPerformanceSamples(): Promise<{ tps: number; skipRate: number }> {
    const response = await fetch(this.config.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getRecentPerformanceSamples",
        params: [1],
      }),
    });

    const data = await response.json();
    const sample = data.result?.[0];
    
    if (!sample) return { tps: 0, skipRate: 0 };

    const tps = sample.numTransactions / sample.samplePeriodSecs;
    const skipRate = sample.numSlots > 0 
      ? (sample.numSlots - sample.numNonVoteTransactions) / sample.numSlots 
      : 0;

    return { tps: Math.round(tps), skipRate };
  }

  subscribe(callback: (metrics: NetworkMetrics) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    if (!this.metrics) return;
    this.listeners.forEach((cb) => cb(this.metrics!));
  }

  evaluateNetworkHealth(): SystemState {
    if (!this.metrics) return "NOMINAL";

    const { tps, skipRate, blockTime } = this.metrics;

    if (skipRate > 0.15 || tps < 500 || blockTime > 800) {
      return "EMERGENCY";
    }
    
    if (skipRate > 0.08 || tps < 1500 || blockTime > 500) {
      return "DEGRADED";
    }

    return "NOMINAL";
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[NetworkMonitor] Started monitoring");
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("[NetworkMonitor] Stopped monitoring");
  }

  getMetrics(): NetworkMetrics | null {
    return this.metrics;
  }
}

export const networkMonitor = new NetworkMonitor();
