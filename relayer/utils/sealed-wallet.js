import crypto from "crypto";

function getPepper() {
  return process.env.WALLET_ENCRYPTION_PEPPER || "change-me-in-production";
}

function deriveKey(pin, saltHex) {
  const pepper = getPepper();
  return crypto.scryptSync(`${pin}:${pepper}`, Buffer.from(saltHex, "hex"), 32);
}

export function sealSecret(secret, pin) {
  if (!pin || String(pin).length < 4) {
    throw new Error("PIN must be at least 4 characters");
  }
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(String(pin), salt.toString("hex"));
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    meta: {
      alg: "aes-256-gcm",
      kdf: "scrypt",
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    },
  };
}

export function unsealSecret(encrypted, pin, meta) {
  const key = deriveKey(String(pin), meta.salt);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(meta.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(meta.tag, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

