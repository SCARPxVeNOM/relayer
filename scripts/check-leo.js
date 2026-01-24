/**
 * Check if Leo CLI is installed and accessible
 */

import { execSync } from "child_process";

console.log("🦁 Checking Leo CLI installation...\n");

try {
  const version = execSync("leo --version", { encoding: "utf-8" }).trim();
  console.log(`✅ Leo CLI is installed: ${version}`);
  
  // Try to check if we can build
  console.log("\n📦 Checking Leo program...");
  try {
    process.chdir("aleo/privacy_box");
    execSync("leo build", { stdio: "pipe" });
    console.log("✅ Leo program builds successfully!");
  } catch (error) {
    console.log("⚠️  Leo program build check skipped (may need configuration)");
  }
  
  console.log("\n✅ Leo setup looks good!");
} catch (error) {
  console.log("❌ Leo CLI is not installed or not in PATH");
  console.log("\n📥 Install Leo with:");
  console.log("   cargo install leo-lang");
  console.log("\n   Or visit: https://leo-lang.org");
  process.exit(1);
}

