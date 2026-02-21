import appDb from "../../storage/app.db.js";
import { sendJson } from "../http.js";
import { requireAuth } from "../auth.helpers.js";
import { normalizePhone } from "../../services/otp.service.js";
import { resolveUsernameToWallet } from "../../services/identity.directory.service.js";

export async function resolveRecipientContact(req, res, url) {
  const auth = requireAuth(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, { success: false, error: auth.error });
  }

  try {
    const rawUsername = String(url.searchParams.get("username") || "").trim();
    if (rawUsername) {
      const recipient = resolveUsernameToWallet(rawUsername);
      if (!recipient?.walletAddress) {
        return sendJson(res, 404, {
          success: false,
          error: "No on-chain username claim found for this username",
        });
      }

      return sendJson(res, 200, {
        success: true,
        username: recipient.username,
        displayName: recipient.displayName || null,
        walletAddress: recipient.walletAddress,
        userId: recipient.userId,
        source: recipient.source,
      });
    }

    const rawPhone = String(url.searchParams.get("phone") || "").trim();
    if (!rawPhone) {
      return sendJson(res, 400, { success: false, error: "username or phone query param is required" });
    }

    const phone = normalizePhone(rawPhone);
    const recipient = appDb.getUserByPhone(phone);
    if (!recipient?.wallet_address) {
      return sendJson(res, 404, {
        success: false,
        error: "No onboarded recipient found for this phone number",
      });
    }

    sendJson(res, 200, {
      success: true,
      phone,
      username: recipient.username || null,
      displayName: recipient.display_name || null,
      walletAddress: recipient.wallet_address,
      userId: recipient.id,
    });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
}
