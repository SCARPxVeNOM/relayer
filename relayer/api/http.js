/**
 * Minimal HTTP helpers for Node's built-in `http` server.
 * We intentionally do NOT use Express here.
 */

export function sendJson(res, statusCode, payload) {
  // Don't clobber headers set by the caller, but ensure JSON content-type.
  try {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json");
    }
  } catch {
    // ignore
  }

  res.writeHead(statusCode);
  res.end(JSON.stringify(payload, null, 2));
}

export async function readJsonBody(req, { maxBytes = 1_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = "";

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      raw += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (err) => reject(err));
  });
}


