interface RpcHealth {
  endpoint: string;
  latency: number;
  isHealthy: boolean;
  lastCheck: Date;
}

export class RpcHealthChecker {
  private endpoints: string[];
  private healthStatus: Map<string, RpcHealth> = new Map();

  constructor(endpoints: string[] = ["https://api.mainnet-beta.solana.com"]) {
    this.endpoints = endpoints;
  }

  async checkEndpoint(endpoint: string): Promise<RpcHealth> {
    const start = Date.now();
    let isHealthy = false;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      });

      const data = await response.json();
      isHealthy = data.result === "ok";
    } catch {
      isHealthy = false;
    }

    const health: RpcHealth = {
      endpoint,
      latency: Date.now() - start,
      isHealthy,
      lastCheck: new Date(),
    };

    this.healthStatus.set(endpoint, health);
    return health;
  }

  async checkAll(): Promise<RpcHealth[]> {
    return Promise.all(this.endpoints.map((e) => this.checkEndpoint(e)));
  }

  getHealthyEndpoints(): string[] {
    return Array.from(this.healthStatus.values())
      .filter((h) => h.isHealthy)
      .map((h) => h.endpoint);
  }
}

export const rpcChecker = new RpcHealthChecker();
