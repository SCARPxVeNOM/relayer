/**
 * Centralized configuration management
 */

import { CHAINS, CHAIN_NAMES, RPC_URLS } from "./chains.js";
import * as constants from "./constants.js";

export { CHAINS, CHAIN_NAMES, RPC_URLS };
export { constants };

/**
 * Validate configuration
 */
export function validateConfig() {
  const errors = [];

  if (!process.env.RELAYER_PK) {
    errors.push("RELAYER_PK is required");
  }

  if (!process.env.SEPOLIA_RPC && !RPC_URLS[CHAINS.ETH_SEPOLIA]) {
    errors.push("SEPOLIA_RPC is required");
  }

  if (!process.env.POLYGON_AMOY_RPC && !RPC_URLS[CHAINS.POLYGON_AMOY]) {
    errors.push("POLYGON_AMOY_RPC is required");
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(", ")}`);
  }
}

