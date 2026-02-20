import appDb from "../storage/app.db.js";

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") {
    return null;
  }
  const [type, value] = header.split(" ");
  if (type !== "Bearer" || !value) {
    return null;
  }
  return value.trim();
}

export function requireAuth(req) {
  appDb.cleanupExpired();
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, statusCode: 401, error: "Missing bearer token" };
  }

  const session = appDb.getSession(token);
  if (!session) {
    return { ok: false, statusCode: 401, error: "Invalid session token" };
  }
  if (session.expires_at <= Date.now()) {
    return { ok: false, statusCode: 401, error: "Session expired" };
  }

  const user = appDb.getUserById(session.user_id);
  if (!user) {
    return { ok: false, statusCode: 401, error: "User not found" };
  }

  return { ok: true, user, session };
}

