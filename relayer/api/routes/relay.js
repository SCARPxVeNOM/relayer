import crypto from "crypto";
import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";

function fakeAleoTxId() {
  return `at1${crypto.randomBytes(28).toString("hex")}`;
}

export async function submitRelay(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const body = await readJsonBody(req, { maxBytes: 3_000_000 });
    const serializedTransaction = body.serializedTransaction
      ? String(body.serializedTransaction)
      : null;
    const aleoTxId = body.aleoTxId ? String(body.aleoTxId) : null;
    const clientTxId = body.clientTxId ? String(body.clientTxId) : null;

    if (!serializedTransaction && !aleoTxId) {
      return sendJson(res, 400, {
        success: false,
        error: "Provide serializedTransaction or aleoTxId",
      });
    }

    let mode = "register_only";
    let status = "accepted";
    let txId = aleoTxId;
    let responsePayload = null;

    if (!txId && serializedTransaction) {
      const submitUrl = process.env.ALEO_RELAY_SUBMIT_URL;
      if (submitUrl) {
        mode = "network_submit";
        let requestBody = { transaction: serializedTransaction };
        const payloadMode = (process.env.ALEO_RELAY_PAYLOAD_MODE || "auto").toLowerCase();
        if (payloadMode === "raw" || payloadMode === "auto") {
          const trimmed = serializedTransaction.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              requestBody = JSON.parse(trimmed);
            } catch {
              if (payloadMode === "raw") {
                throw new Error("serializedTransaction is not valid JSON while ALEO_RELAY_PAYLOAD_MODE=raw");
              }
            }
          }
        }
        const response = await fetch(submitUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Aleo-SDK-Version": process.env.ALEO_SDK_VERSION || "0.7.4",
          },
          body: JSON.stringify(requestBody),
        });
        responsePayload = await response.json().catch(() => ({}));
        if (!response.ok) {
          status = "failed";
          txId = null;
        } else {
          txId = responsePayload.transactionId || responsePayload.tx_id || responsePayload.id || fakeAleoTxId();
        }
      } else {
        mode = "mock_submit";
        txId = fakeAleoTxId();
        responsePayload = { note: "No ALEO_RELAY_SUBMIT_URL configured. Returned mock tx id." };
      }
    }

    const submission = appDb.createRelaySubmission({
      userId: auth.user.id,
      clientTxId,
      serializedLength: serializedTransaction?.length || 0,
      aleoTxId: txId,
      status,
      mode,
      responseJson: responsePayload,
    });

    sendJson(res, 200, {
      success: true,
      submissionId: submission.id,
      status: submission.status,
      mode: submission.mode,
      aleoTxId: submission.aleo_tx_id,
      note:
        mode === "mock_submit"
          ? "Blind relayer accepted tx bytes but returned mock tx id (no submit URL configured)."
          : "Blind relayer accepted request.",
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}

export async function listRelaySubmissions(req, res) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  sendJson(res, 200, {
    success: true,
    submissions: appDb.listRelaySubmissions(auth.user.id),
  });
}

export async function getRelayStatus(req, res, txId) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }
  if (!txId || !txId.startsWith("at1")) {
    return sendJson(res, 400, { success: false, error: "Invalid Aleo transaction ID" });
  }

  const explicit = process.env.ALEO_RELAY_STATUS_URL
    ? process.env.ALEO_RELAY_STATUS_URL.replace(/\/+$/, "")
    : null;

  const candidates = [
    explicit ? `${explicit}/${txId}` : null,
    `https://api.explorer.provable.com/v2/testnet/transaction/${txId}`,
    `https://api.explorer.provable.com/v1/testnet/transaction/${txId}`,
  ].filter(Boolean);

  let lastError = null;
  for (const url of candidates) {
    try {
      const response = await fetch(url, { method: "GET" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = payload?.message || payload?.error || `${response.status} ${response.statusText}`;
        continue;
      }

      const normalizedStatus =
        payload?.status ||
        payload?.type ||
        payload?.state ||
        payload?.transaction?.status ||
        "unknown";

      return sendJson(res, 200, {
        success: true,
        txId,
        status: String(normalizedStatus).toLowerCase(),
        source: url,
        raw: payload,
      });
    } catch (error) {
      lastError = error.message;
    }
  }

  return sendJson(res, 502, {
    success: false,
    error: lastError || "Unable to fetch relay status",
    txId,
  });
}
