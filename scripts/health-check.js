/**
 * Health check script
 */

import "dotenv/config";
import healthService from "../relayer/services/health.service.js";
import { createLogger } from "../relayer/utils/logger.js";

const logger = createLogger("HealthCheck");

async function main() {
  try {
    logger.info("Running health check...");
    
    const health = await healthService.fullHealthCheck();
    
    console.log("\n📊 Health Check Results:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Status: ${health.status.toUpperCase()}`);
    console.log(`Timestamp: ${health.timestamp}\n`);
    
    console.log("💰 Balances:");
    if (health.balances.ethereumSepolia) {
      console.log(`  Ethereum Sepolia: ${health.balances.ethereumSepolia.balance} ETH`);
      console.log(`    Address: ${health.balances.ethereumSepolia.address}`);
    }
    if (health.balances.polygonAmoy) {
      console.log(`  Polygon Amoy: ${health.balances.polygonAmoy.balance} MATIC`);
      console.log(`    Address: ${health.balances.polygonAmoy.address}`);
    }
    
    console.log("\n🔗 Aleo Connection:");
    console.log(`  Connected: ${health.aleo.connected ? "✅" : "❌"}`);
    if (health.aleo.connected) {
      console.log(`  Latest Block: ${health.aleo.latestBlockHeight}`);
      console.log(`  Program ID: ${health.aleo.programId}`);
    }
    
    console.log("\n⚙️  Configuration:");
    console.log(`  Simulation Mode: ${health.configuration.simulationMode ? "Enabled" : "Disabled"}`);
    console.log(`  Log Level: ${health.configuration.logLevel}`);
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    if (health.status === "healthy") {
      console.log("✅ All systems operational");
      process.exit(0);
    } else {
      console.log("⚠️  System degraded - check errors above");
      process.exit(1);
    }
  } catch (error) {
    logger.error("Health check failed", error);
    process.exit(1);
  }
}

main();

