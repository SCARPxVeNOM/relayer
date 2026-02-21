import "dotenv/config";
import healthAPI from "./api/health.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger("EnvelopServer");

function isTruthy(value) {
  const normalized = String(value || "").toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizedOtpProvider() {
  const provider = String(process.env.OTP_PROVIDER || "disabled")
    .trim()
    .toLowerCase();
  if (!provider || provider === "off" || provider === "none") {
    return "disabled";
  }
  return provider;
}

function validateProductionSecurityConfig() {
  const problems = [];
  const otpProvider = normalizedOtpProvider();

  if (otpProvider !== "disabled" && otpProvider !== "twilio_verify") {
    problems.push("OTP_PROVIDER must be disabled or twilio_verify");
  }

  if (otpProvider === "twilio_verify") {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      problems.push("TWILIO_ACCOUNT_SID is required when OTP_PROVIDER=twilio_verify");
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      problems.push("TWILIO_AUTH_TOKEN is required when OTP_PROVIDER=twilio_verify");
    }
    if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
      problems.push("TWILIO_VERIFY_SERVICE_SID is required when OTP_PROVIDER=twilio_verify");
    }
  }

  const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  if (!isProduction) {
    if (problems.length > 0) {
      throw new Error(`Runtime config invalid: ${problems.join("; ")}`);
    }
    return;
  }

  if (!isTruthy(process.env.WALLET_AUTH_STRICT || "false")) {
    problems.push("WALLET_AUTH_STRICT must be true in production");
  }

  if (!process.env.ALEO_RELAY_SUBMIT_URL) {
    problems.push("ALEO_RELAY_SUBMIT_URL must be configured in production");
  }

  if (!process.env.WALLET_ENCRYPTION_PEPPER || process.env.WALLET_ENCRYPTION_PEPPER === "change-me-in-production") {
    problems.push("WALLET_ENCRYPTION_PEPPER must be set to a strong secret in production");
  }

  if (problems.length > 0) {
    throw new Error(`Production security config invalid: ${problems.join("; ")}`);
  }
}

async function main() {
  try {
    validateProductionSecurityConfig();
    logger.info("Starting Envelop Aleo Fintech backend", {
      port: process.env.PORT || process.env.HEALTH_PORT || "3001",
      otpProvider: normalizedOtpProvider(),
      walletAuthStrict: String(process.env.WALLET_AUTH_STRICT || "false"),
      relayMode: process.env.ALEO_RELAY_SUBMIT_URL ? "network_submit" : "client_txid_only",
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
