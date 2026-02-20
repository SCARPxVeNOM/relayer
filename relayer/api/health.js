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
import { getMe, listSupportedTokens, getBalances, getActivity } from "./routes/assets.js";
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

const logger = createLogger("AleoFintechAPI");

function uptimeInfo() {
  return {
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

function telemetryStub() {
  return {
    bridgeLink: "STABLE",
    encryptionEngine: "LOCKED",
    networkOrientation: [1, 1, 1, 1, 0],
    zkSystemStatus: "Aleo shielded records active",
    mode: "aleo-native",
  };
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

    // Backward compatible telemetry endpoints used by existing UI widgets.
    if (method === "GET" && pathname === "/api/telemetry") {
      return sendJson(res, 200, telemetryStub());
    }
    if (method === "GET" && pathname === "/api/latency") {
      return sendJson(res, 200, { value: 22, unit: "ms", status: "SECURED" });
    }
    if (method === "GET" && pathname === "/api/heartbeat") {
      return sendJson(res, 200, { pulseRate: "NORMAL", activity: 2, timestamp: Date.now() });
    }
    if (method === "GET" && pathname === "/api/chains") {
      return sendJson(res, 200, {
        linkStatus: "ALEO_NATIVE",
        chains: [{ id: "aleo-testnet", status: "active" }],
      });
    }
    if (method === "GET" && pathname === "/api/aleo/status") {
      return sendJson(res, 200, {
        status: "active",
        program:
          process.env.ALEO_PROGRAM_ID ||
          "envelop_swap.aleo + envelop_invoice.aleo + envelop_payments.aleo + envelop_yield.aleo",
        zkProof: "enabled",
      });
    }
    if (method === "GET" && pathname === "/api/version") {
      return sendJson(res, 200, {
        protocol: "ENVELOP-2",
        gateway: "ALEO_FINTECH_CORE",
        build: process.env.npm_package_version || "1.0.0",
      });
    }
    if (method === "GET" && pathname === "/api/relayers") {
      return sendJson(res, 200, {
        activeNode: "BLIND_RELAYER_ALEO_01",
        availableUplinks: 1,
        region: process.env.RELAYER_REGION || "us-central",
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

    // Wallet + assets
    if (method === "GET" && pathname === "/api/me") {
      return getMe(req, res);
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
