import "dotenv/config";
import healthAPI from "./api/health.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger("EnvelopServer");

async function main() {
  try {
    logger.info("Starting Envelop Aleo Fintech backend", {
      port: process.env.PORT || process.env.HEALTH_PORT || "3001",
      otpProvider: process.env.OTP_PROVIDER || "mock",
      walletAuthStrict: String(process.env.WALLET_AUTH_STRICT || "false"),
      relayMode: process.env.ALEO_RELAY_SUBMIT_URL ? "network_submit" : "mock_submit",
    });
    healthAPI.start();
  } catch (error) {
    logger.error("Failed to start backend", error);
    process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("relayer/index.js") || process.argv[1].endsWith("relayer\\index.js"));

if (isMain || !process.env.NODE_ENV) {
  main().catch((error) => {
    logger.error("Unhandled server startup error", error);
    process.exit(1);
  });
}

process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down...");
  healthAPI.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down...");
  healthAPI.stop();
  process.exit(0);
});

export { main };
