interface StakeInfo {
  validatorPubkey: string;
  stake: number;
  percentage: number;
}

export class StakeDistributionAnalyzer {
  private rpcEndpoint: string;
  private distribution: StakeInfo[] = [];
  private totalStake: number = 0;

  constructor(rpcEndpoint = "https://api.mainnet-beta.solana.com") {
    this.rpcEndpoint = rpcEndpoint;
  }

  async fetchDistribution(): Promise<StakeInfo[]> {
    const response = await fetch(this.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getVoteAccounts",
      }),
    });

    const data = await response.json();
    const validators = data.result?.current || [];

    this.totalStake = validators.reduce(
      (sum: number, v: any) => sum + v.activatedStake,
      0
    );

    this.distribution = validators.map((v: any) => ({
      validatorPubkey: v.nodePubkey,
      stake: v.activatedStake,
      percentage: (v.activatedStake / this.totalStake) * 100,
    }));

    return this.distribution;
  }

  getTopValidators(limit = 10): StakeInfo[] {
    return [...this.distribution]
      .sort((a, b) => b.stake - a.stake)
      .slice(0, limit);
  }

  getTotalStake(): number {
    return this.totalStake;
  }
}

export const stakeAnalyzer = new StakeDistributionAnalyzer();
