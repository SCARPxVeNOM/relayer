import "dotenv/config";
import { execSync } from "child_process";
import { existsSync } from "fs";

const endpoint = process.env.ALEO_ENDPOINT || "https://api.explorer.provable.com/v2";
const network = process.env.ALEO_NETWORK || "testnet";
const privateKey = process.env.ALEO_PRIVATE_KEY;

if (!privateKey) {
  console.error("ALEO_PRIVATE_KEY is required in .env");
  process.exit(1);
}

const programs = [
  "aleo/envelop_swap",
  "aleo/envelop_invoice",
  "aleo/envelop_payments",
  "aleo/envelop_yield",
];

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
}

try {
  const version = run("leo --version").trim();
  console.log(`Leo CLI: ${version}`);
} catch (error) {
  console.error("Leo CLI not found. Install leo 3.4.0+.");
  process.exit(1);
}

for (const dir of programs) {
  if (!existsSync(`${dir}/src/main.leo`)) {
    console.error(`Missing program: ${dir}/src/main.leo`);
    process.exit(1);
  }
}

for (const dir of programs) {
  console.log(`\n=== ${dir} ===`);
  console.log("Building...");
  try {
    execSync(`leo build --path ${dir}`, { stdio: "inherit" });
  } catch {
    console.error(`Build failed: ${dir}`);
    process.exit(1);
  }

  console.log("Deploying...");
  try {
    execSync(
      [
        `leo deploy --path ${dir}`,
        `--network ${network}`,
        `--endpoint ${endpoint}`,
        `--private-key ${privateKey}`,
        "--broadcast --yes",
      ].join(" "),
      { stdio: "inherit" }
    );
  } catch {
    console.error(`Deploy failed: ${dir}`);
    process.exit(1);
  }
}

console.log("\nDeployment flow finished.");
