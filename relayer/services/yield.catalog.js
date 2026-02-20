export const YIELD_ASSETS = [
  {
    id: "YLD_ALEO_VALIDATOR_STAKE",
    name: "Aleo Validator Stake",
    protocol: "Aleo Native",
    strategyType: "staking",
    tokenId: "ALEO",
    rewardTokenId: "ALEO",
    riskLevel: "low",
    apyBps: 920,
    minApyBps: 700,
    maxApyBps: 1250,
    lockupDays: 7,
    exitFeeBps: 20,
    capacityAtomic: "800000000000",
    strategyField: "101field",
  },
  {
    id: "YLD_USDC_PRIVATE_LEND",
    name: "Private USDC Yield Vault",
    protocol: "Envelop Vault",
    strategyType: "lending",
    tokenId: "USDC",
    rewardTokenId: "USDC",
    riskLevel: "medium",
    apyBps: 1180,
    minApyBps: 850,
    maxApyBps: 1650,
    lockupDays: 0,
    exitFeeBps: 10,
    capacityAtomic: "1200000000000",
    strategyField: "102field",
  },
  {
    id: "YLD_WETH_WEIGHTED_LP",
    name: "Private WETH LP Strategy",
    protocol: "Envelop AMM",
    strategyType: "liquidity",
    tokenId: "WETH",
    rewardTokenId: "WETH",
    riskLevel: "high",
    apyBps: 1680,
    minApyBps: 1000,
    maxApyBps: 2600,
    lockupDays: 0,
    exitFeeBps: 35,
    capacityAtomic: "350000000000000000000",
    strategyField: "103field",
  },
  {
    id: "YLD_ALEO_DELTA_NEUTRAL",
    name: "Aleo Delta-Neutral Vault",
    protocol: "Envelop Vault",
    strategyType: "vault",
    tokenId: "ALEO",
    rewardTokenId: "ALEO",
    riskLevel: "medium",
    apyBps: 1320,
    minApyBps: 950,
    maxApyBps: 1900,
    lockupDays: 1,
    exitFeeBps: 15,
    capacityAtomic: "400000000000",
    strategyField: "104field",
  },
];

export function getYieldAssetById(assetId) {
  return YIELD_ASSETS.find((asset) => asset.id === assetId);
}

export function listYieldAssetsByToken(tokenId) {
  if (!tokenId) {
    return [...YIELD_ASSETS];
  }
  return YIELD_ASSETS.filter((asset) => asset.tokenId === String(tokenId).toUpperCase());
}

