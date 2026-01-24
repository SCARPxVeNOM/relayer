/**
 * Generate a new relayer private key for testnet use
 * WARNING: This is for TESTNET only. Never use for mainnet!
 */

import "dotenv/config";
import { ethers } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "fs";

console.log("🔑 Generating Relayer Private Key for Testnet...\n");

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log("✅ New wallet generated!\n");
console.log("📋 Your Relayer Details:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Private Key: ${wallet.privateKey}`);
console.log(`Address:     ${wallet.address}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("⚠️  IMPORTANT SECURITY NOTES:");
console.log("   1. This private key is for TESTNET only");
console.log("   2. Never commit this to git or share publicly");
console.log("   3. Store it securely in your .env file");
console.log("   4. Get testnet tokens for this address:\n");
console.log(`   📍 Ethereum Sepolia: ${wallet.address}`);
console.log(`   📍 Polygon Amoy:     ${wallet.address}\n`);

// Check if .env exists
const envPath = ".env";
if (existsSync(envPath)) {
  console.log("📝 Updating .env file...");
  let envContent = readFileSync(envPath, "utf-8");
  
  // Replace or add RELAYER_PK
  if (envContent.includes("RELAYER_PK=")) {
    envContent = envContent.replace(
      /RELAYER_PK=.*/,
      `RELAYER_PK=${wallet.privateKey}`
    );
  } else {
    envContent += `\nRELAYER_PK=${wallet.privateKey}\n`;
  }
  
  writeFileSync(envPath, envContent);
  console.log("✅ Updated .env file with new RELAYER_PK\n");
} else {
  console.log("📝 Creating .env file from .env.example...");
  try {
    const exampleContent = readFileSync(".env.example", "utf-8");
    const newContent = exampleContent.replace(
      /RELAYER_PK=.*/,
      `RELAYER_PK=${wallet.privateKey}`
    );
    writeFileSync(envPath, newContent);
    console.log("✅ Created .env file with new RELAYER_PK\n");
  } catch (error) {
    console.log("⚠️  Could not create .env automatically");
    console.log("   Please manually add to .env:");
    console.log(`   RELAYER_PK=${wallet.privateKey}\n`);
  }
}

console.log("🎯 Next Steps:");
console.log("   1. Fund this address with testnet tokens:");
console.log("      - Sepolia ETH: https://sepoliafaucet.com");
console.log("      - Amoy MATIC:  https://faucet.polygon.technology");
console.log("   2. Verify .env file has the correct RELAYER_PK");
console.log("   3. Run: npm start\n");

