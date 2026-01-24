/**
 * Chain configuration for multi-chain relayer
 */

export const CHAINS = {
  ETH: 1,
  POLYGON: 137,
  ETH_SEPOLIA: 11155111,
  POLYGON_AMOY: 80002,
};

export const CHAIN_NAMES = {
  [CHAINS.ETH_SEPOLIA]: "Ethereum Sepolia",
  [CHAINS.POLYGON_AMOY]: "Polygon Amoy",
};

export const RPC_URLS = {
  [CHAINS.ETH_SEPOLIA]: process.env.SEPOLIA_RPC || "https://sepolia.infura.io/v3/YOUR_KEY",
  [CHAINS.POLYGON_AMOY]: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
};

