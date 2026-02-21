import http from "http";
import appDb from "../storage/app.db.js";
import { createLogger } from "../utils/logger.js";
import { sendJson } from "./http.js";
import {
  sendOtpCode,
  verifyOtpCode,
  createWalletChallenge,
  verifyWalletChallenge,
} from "./routes/auth.js";
import {
  createPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  createPasskeyLoginOptions,
  verifyPasskeyLogin,
} from "./routes/passkey.js";
import { getMe, updateMyProfile, listSupportedTokens, getBalances, getActivity } from "./routes/assets.js";
import { getSwapQuote, postSwapExecute, listSwaps } from "./routes/swap.js";
import { sendPayment, listPayments } from "./routes/payments.js";
import { createInvoice, listInvoices, payInvoice } from "./routes/invoices.js";
import {
  yieldGetAssets,
  yieldGetQuote,
  yieldSolve,
  listYieldQuotes,
  listYieldActions,
} from "./routes/yield.js";
import { submitRelay, listRelaySubmissions, getRelayStatus } from "./routes/relay.js";
import { resolveRecipientContact } from "./routes/contacts.js";
import { isOnchainLedgerMode } from "../services/onchain.mode.service.js";
import { getAleoFeatureTxPolicy } from "../services/aleo.feature.tx.service.js";

const logger = createLogger("AleoFintechAPI");

function uptimeInfo() {
  return {
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

function runtimeTelemetry() {
  const nodeEnv = String(process.env.NODE_ENV || "development");
  const otpProvider = String(process.env.OTP_PROVIDER || "unset");
  const relayConfigured = Boolean(process.env.ALEO_RELAY_SUBMIT_URL);
  const network = String(process.env.ALEO_NETWORK || "testnet");
  return {
    mode: "aleo-native",
    environment: nodeEnv,
    network,
    otpProvider,
    relaySubmitConfigured: relayConfigured,
    walletAuthStrict: String(process.env.WALLET_AUTH_STRICT || "false"),
    uptimeSec: Math.floor(process.uptime()),
  };
}

function configuredAleoPrograms() {
  const programs = [
    process.env.ALEO_SWAP_PROGRAM_ID,
    process.env.ALEO_INVOICE_PROGRAM_ID,
    process.env.ALEO_PAYMENTS_PROGRAM_ID,
    process.env.ALEO_YIELD_PROGRAM_ID,
    process.env.ALEO_IDENTITY_PROGRAM_ID,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return Array.from(new Set(programs));
}

class HealthAPI {
  constructor() {
    this.server = null;
    this.port = parseInt(process.env.PORT || process.env.HEALTH_PORT || "3001", 10);
  }

  async route(req, res, url) {
    const method = req.method || "GET";
    const pathname = url.pathname;

    if (method === "GET" && pathname === "/health") {
      return sendJson(res, 200, {
        status: "healthy",
        service: "envelop-aleo-fintech",
        ...uptimeInfo(),
      });
    }

    if (method === "GET" && pathname === "/status") {
      appDb.cleanupExpired();
      return sendJson(res, 200, {
        status: "running",
        service: "envelop-aleo-fintech",
        ...uptimeInfo(),
      });
    }

    // Backward compatible telemetry endpoints.
    if (method === "GET" && pathname === "/api/telemetry") {
      return sendJson(res, 200, runtimeTelemetry());
    }
    if (method === "GET" && pathname === "/api/latency") {
      return sendJson(res, 200, {
        status: "ok",
        serverTime: Date.now(),
      });
    }
    if (method === "GET" && pathname === "/api/heartbeat") {
      return sendJson(res, 200, {
        status: "alive",
        timestamp: Date.now(),
        uptimeSec: Math.floor(process.uptime()),
      });
    }
    if (method === "GET" && pathname === "/api/chains") {
      const configuredNetwork = String(process.env.ALEO_NETWORK || "").trim();
      const network = configuredNetwork || "testnet";
      return sendJson(res, 200, {
        linkStatus: configuredNetwork ? "configured" : "defaulted",
        chains: [{ id: `aleo-${network}`, status: configuredNetwork ? "configured" : "defaulted" }],
      });
    }
    if (method === "GET" && pathname === "/api/aleo/status") {
      const onchainLedger = isOnchainLedgerMode();
      const txPolicy = getAleoFeatureTxPolicy();
      const programs = configuredAleoPrograms();
      return sendJson(res, 200, {
        status: "active",
        program: programs.length > 0 ? programs.join(", ") : null,
        zkProof: "enabled",
        ledgerMode: onchainLedger ? "onchain_canonical" : "backend_simulated",
        txPolicy,
      });
    }
    if (method === "GET" && pathname === "/api/version") {
      return sendJson(res, 200, {
        service: "envelop-aleo-fintech",
        release: process.env.RELEASE_TAG || process.env.npm_package_version || "dev",
        build: process.env.BUILD_ID || process.env.npm_package_version || "dev",
        commit: process.env.GIT_COMMIT_SHA || null,
      });
    }
    if (method === "GET" && pathname === "/api/relayers") {
      const relaySubmitUrl = String(process.env.ALEO_RELAY_SUBMIT_URL || "").trim() || null;
      return sendJson(res, 200, {
        mode: relaySubmitUrl ? "network_submit" : "client_txid_only",
        relaySubmitUrl,
        region: String(process.env.RELAYER_REGION || "").trim() || null,
      });
    }

    // Auth + onboarding
    if (method === "POST" && pathname === "/api/auth/otp/send") {
      return sendOtpCode(req, res);
    }
    if (method === "POST" && pathname === "/api/auth/otp/verify") {
      return verifyOtpCode(req, res);
    }
    if (method === "POST" && pathname === "/api/auth/wallet/challenge") {
      return createWalletChallenge(req, res);
    }
    if (method === "POST" && pathname === "/api/auth/wallet/verify") {
      return verifyWalletChallenge(req, res);
    }
    if (method === "POST" && pathname === "/api/auth/passkey/register/options") {
      return createPasskeyRegistrationOptions(req, res);
    }
    if (method === "POST" && pathname === "/api/auth/passkey/register/verify") {
      return verifyPasskeyRegistration(req, res);
    }
    if (method === "POST" && pathname === "/api/auth/passkey/login/options") {
      return createPasskeyLoginOptions(req, res);
    }
    if (method === "POST" && pathname === "/api/auth/passkey/login/verify") {
      return verifyPasskeyLogin(req, res);
    }

    // Wallet + assets
    if (method === "GET" && pathname === "/api/me") {
      return getMe(req, res);
    }
    if (method === "POST" && pathname === "/api/me/profile") {
      return updateMyProfile(req, res);
    }
    if (method === "GET" && pathname === "/api/assets/tokens") {
      return listSupportedTokens(req, res);
    }
    if (method === "GET" && pathname === "/api/assets/balances") {
      return getBalances(req, res);
    }
    if (method === "GET" && pathname === "/api/assets/activity") {
      return getActivity(req, res);
    }
    if (method === "GET" && pathname === "/api/contacts/resolve") {
      return resolveRecipientContact(req, res, url);
    }

    // Swap
    if (method === "POST" && pathname === "/api/swap/quote") {
      return getSwapQuote(req, res);
    }
    if (method === "POST" && pathname === "/api/swap/execute") {
      return postSwapExecute(req, res);
    }
    if (method === "GET" && pathname === "/api/swaps") {
      return listSwaps(req, res);
    }

    // Yield / stake
    if (method === "GET" && (pathname === "/api/yield/get_assets" || pathname === "/api/yield/assets")) {
      return yieldGetAssets(req, res, url);
    }
    if (method === "POST" && (pathname === "/api/yield/get_quote" || pathname === "/api/yield/quote")) {
      return yieldGetQuote(req, res);
    }
    if (method === "POST" && pathname === "/api/yield/solve") {
      return yieldSolve(req, res);
    }
    if (method === "GET" && pathname === "/api/yield/quotes") {
      return listYieldQuotes(req, res, url);
    }
    if (method === "GET" && pathname === "/api/yield/actions") {
      return listYieldActions(req, res, url);
    }

    // Payments
    if (method === "POST" && pathname === "/api/payments/send") {
      return sendPayment(req, res);
    }
    if (method === "GET" && pathname === "/api/payments") {
      return listPayments(req, res);
    }

    // Invoices
    if (method === "POST" && pathname === "/api/invoices") {
      return createInvoice(req, res);
    }
    if (method === "GET" && pathname === "/api/invoices") {
      return listInvoices(req, res);
    }
    if (method === "POST" && pathname.startsWith("/api/invoices/") && pathname.endsWith("/pay")) {
      const parts = pathname.split("/");
      const invoiceId = parts[3];
      return payInvoice(req, res, invoiceId);
    }

    // Blind relay
    if (method === "POST" && pathname === "/api/relay/submit") {
      return submitRelay(req, res);
    }
    if (method === "GET" && pathname === "/api/relay/submissions") {
      return listRelaySubmissions(req, res);
    }
    if (method === "GET" && pathname.startsWith("/api/relay/status/")) {
      const parts = pathname.split("/");
      const txId = parts[4];
      return getRelayStatus(req, res, txId);
    }

    return sendJson(res, 404, {
      success: false,
      error: "Not found",
      path: pathname,
    });
  }

  start() {
    appDb.initialize();
    this.server = http.createServer(async (req, res) => {
      try {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Content-Type", "application/json");

        if (req.method === "OPTIONS") {
          res.writeHead(200);
          res.end();
          return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        await this.route(req, res, url);
      } catch (error) {
        logger.error("Unhandled API error", error);
        sendJson(res, 500, { success: false, error: "Internal server error" });
      }
    });

    this.server.listen(this.port, () => {
      logger.info(`API server listening on port ${this.port}`);
    });
  }

  stop() {
    if (!this.server) {
      return;
    }
    this.server.close(() => {
      logger.info("API server stopped");
    });
    appDb.close();
  }
}

export default new HealthAPI();
