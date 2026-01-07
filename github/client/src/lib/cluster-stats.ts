interface ClusterStats {
  epoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount: number;
}

export class ClusterStatsService {
  private rpcEndpoint: string;
  private stats: ClusterStats | null = null;

  constructor(rpcEndpoint = "https://api.mainnet-beta.solana.com") {
    this.rpcEndpoint = rpcEndpoint;
  }

  async fetchEpochInfo(): Promise<ClusterStats> {
    const response = await fetch(this.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getEpochInfo",
      }),
    });

    const data = await response.json();
    const result = data.result;

    this.stats = {
      epoch: result.epoch,
      absoluteSlot: result.absoluteSlot,
      blockHeight: result.blockHeight,
      transactionCount: result.transactionCount,
    };

    return this.stats;
  }

  getStats(): ClusterStats | null {
    return this.stats;
  }
}

export const clusterStats = new ClusterStatsService();
