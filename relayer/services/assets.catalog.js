export const SUPPORTED_TOKENS = [
  {
    id: "ALEO",
    symbol: "ALEO",
    name: "Aleo Credits",
    decimals: 6,
    standard: "credits.aleo",
  },
  {
    id: "USDC",
    symbol: "USDC",
    name: "USD Coin (ARC-21)",
    decimals: 6,
    standard: "ARC-21",
  },
  {
    id: "WETH",
    symbol: "WETH",
    name: "Wrapped Ether (ARC-21)",
    decimals: 18,
    standard: "ARC-21",
  },
];

export function getTokenById(tokenId) {
  return SUPPORTED_TOKENS.find((t) => t.id === tokenId);
}

