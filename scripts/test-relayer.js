/**
 * Test script for relayer functionality
 * This simulates the relayer without actually sending transactions
 */

import "dotenv/config";
import { CHAINS, CHAIN_NAMES } from "../relayer/config.js";

console.log("🧪 Testing Relayer Configuration...\n");

// Test chain configuration
console.log("Chain Configuration:");
console.log(`  ETH Sepolia: ${CHAINS.ETH_SEPOLIA} (${CHAIN_NAMES[CHAINS.ETH_SEPOLIA]})`);
console.log(`  Polygon Amoy: ${CHAINS.POLYGON_AMOY} (${CHAIN_NAMES[CHAINS.POLYGON_AMOY]})`);

// Test environment variables
console.log("\nEnvironment Variables:");
const requiredVars = ["RELAYER_PK", "SEPOLIA_RPC", "POLYGON_AMOY_RPC"];
const missing = [];

requiredVars.forEach((varName) => {
  if (process.env[varName]) {
    const value = varName === "RELAYER_PK" 
      ? `${process.env[varName].substring(0, 10)}...` 
      : process.env[varName];
    console.log(`  ✅ ${varName}: ${value}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
    missing.push(varName);
  }
});

if (missing.length > 0) {
  console.log(`\n⚠️  Missing required environment variables: ${missing.join(", ")}`);
  console.log("   Please set them in your .env file");
  process.exit(1);
}

console.log("\n✅ All configuration checks passed!");
console.log("\n💡 Next steps:");
console.log("   1. Make sure you have testnet tokens (Sepolia ETH, Amoy MATIC)");
console.log("   2. Run: npm start");
console.log("   3. Check transaction on block explorers");

