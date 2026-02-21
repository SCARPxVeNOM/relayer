import appDb from "../../storage/app.db.js";
import { sendJson, readJsonBody } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { fetchAleoTxStatus } from "../../services/aleo.tx.service.js";

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
          txId = responsePayload.transactionId || responsePayload.tx_id || responsePayload.id || null;
          if (!txId) {
            status = "failed";
          }
        }
      } else {
        return sendJson(res, 503, {
          success: false,
          error:
            "ALEO_RELAY_SUBMIT_URL is not configured. Provide aleoTxId or configure relay submit URL.",
        });
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
      note: "Blind relayer accepted request.",
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
  try {
    const status = await fetchAleoTxStatus(txId);
    return sendJson(res, 200, {
      success: true,
      txId,
      status: status.rawStatus.toLowerCase(),
      txState: status.txState,
      source: status.source,
      raw: status.raw,
    });
  } catch (error) {
    if (error?.txState === "pending" || error?.txState === "unknown" || error?.statusCode === 409) {
      return sendJson(res, 200, {
        success: true,
        txId,
        status: String(error?.rawStatus || "pending").toLowerCase(),
        txState: error?.txState || "pending",
        source: error?.source || null,
        raw: null,
        note: error?.message || "Transaction is still indexing/confirming.",
      });
    }
    return sendJson(res, error?.statusCode || 502, {
      success: false,
      error: error.message || "Unable to fetch relay status",
      txId,
      ...(error?.txState ? { txState: error.txState } : {}),
      ...(error?.rawStatus ? { status: error.rawStatus } : {}),
    });
  }
}
