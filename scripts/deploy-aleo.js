/**
 * Helper script to deploy Aleo program
 * This script sets up the environment and provides deployment instructions
 */

import "dotenv/config";
import { execSync } from "child_process";
import { existsSync } from "fs";

console.log("🚀 Aleo Program Deployment Helper\n");

// Check if Leo is installed
try {
  const leoVersion = execSync("leo --version", { encoding: "utf-8" }).trim();
  console.log(`✅ Leo CLI installed: ${leoVersion}\n`);
} catch (error) {
  console.log("❌ Leo CLI is not installed or not in PATH");
  console.log("\n📥 Install Leo with:");
  console.log("   cargo install leo-lang");
  console.log("\n   Or visit: https://leo-lang.org");
  process.exit(1);
}

// Check for private key
if (!process.env.ALEO_PRIVATE_KEY) {
  console.log("❌ ALEO_PRIVATE_KEY not found in .env file");
  console.log("   Please add: ALEO_PRIVATE_KEY=your_private_key");
  process.exit(1);
}

console.log("✅ ALEO_PRIVATE_KEY found in .env\n");

// Check if program exists
const programPath = "aleo/privacy_box";
if (!existsSync(`${programPath}/main.leo`)) {
  console.log(`❌ Program not found at ${programPath}/main.leo`);
  process.exit(1);
}

console.log("📦 Program found. Starting deployment process...\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Deployment Steps:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("1️⃣  Building the program...");
try {
  process.chdir(programPath);
  execSync("leo build", { stdio: "inherit" });
  console.log("✅ Build successful!\n");
} catch (error) {
  console.log("❌ Build failed. Check the errors above.");
  process.exit(1);
}

console.log("2️⃣  Deploying to Aleo testnet...");
console.log("   Using private key from .env file\n");

try {
  // Set the private key as environment variable and deploy
  const deployCmd = `$env:ALEO_PRIVATE_KEY="${process.env.ALEO_PRIVATE_KEY}"; leo deploy`;
  execSync(deployCmd, { 
    stdio: "inherit",
    shell: "powershell.exe"
  });
  console.log("\n✅ Deployment successful!");
} catch (error) {
  console.log("\n❌ Deployment failed. Possible reasons:");
  console.log("   - Insufficient Aleo credits");
  console.log("   - Network connectivity issues");
  console.log("   - Invalid private key");
  console.log("   - Program name already exists");
  console.log("\n💡 Try manually:");
  console.log(`   cd ${programPath}`);
  console.log(`   leo deploy`);
  process.exit(1);
}

console.log("\n🎉 Your Aleo program is now deployed!");
console.log("\n📋 Next steps:");
console.log("   1. Note the program ID from the deployment output");
console.log("   2. Update your relayer to use the real program");
console.log("   3. Test with: leo run init <address> <amount>");

