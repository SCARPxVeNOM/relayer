import { execSync } from "child_process";

const PROGRAMS = [
  "aleo/envelop_swap",
  "aleo/envelop_invoice",
  "aleo/envelop_payments",
  "aleo/envelop_yield",
];

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim();
}

console.log("Checking Leo CLI installation...");

try {
  const version = run("leo --version");
  console.log(`Leo CLI: ${version}`);
} catch {
  console.error("Leo CLI is not installed or not in PATH.");
  console.error("Install with: cargo install leo-lang");
  process.exit(1);
}

for (const programPath of PROGRAMS) {
  console.log(`Building ${programPath}...`);
  try {
    execSync(`leo build --path ${programPath}`, { stdio: "inherit" });
  } catch {
    console.error(`Build failed for ${programPath}`);
    process.exit(1);
  }
}

console.log("Leo setup and active programs are valid.");
