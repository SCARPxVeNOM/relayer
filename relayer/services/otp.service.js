function isLikelyUSNumber(phoneDigits) {
  return phoneDigits.length === 10;
}

export function normalizePhone(input) {
  if (!input || typeof input !== "string") {
    throw new Error("Phone number is required");
  }
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    const normalized = `+${digits.slice(1).replace(/\D/g, "")}`;
    if (normalized.length < 8 || normalized.length > 16) {
      throw new Error("Invalid phone number");
    }
    return normalized;
  }
  const onlyDigits = digits.replace(/\D/g, "");
  if (isLikelyUSNumber(onlyDigits)) {
    return `+1${onlyDigits}`;
  }
  if (onlyDigits.length >= 8 && onlyDigits.length <= 15) {
    return `+${onlyDigits}`;
  }
  throw new Error("Invalid phone number");
}

function otpProvider() {
  const provider = String(process.env.OTP_PROVIDER || "").toLowerCase();
  if (provider === "twilio_verify") {
    return "twilio_verify";
  }
  throw new Error(
    "OTP provider is not configured. Set OTP_PROVIDER=twilio_verify with Twilio Verify credentials."
  );
}

async function twilioVerifySend(phone) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !serviceSid) {
    throw new Error("Twilio Verify is not configured");
  }

  const body = new URLSearchParams({
    To: `whatsapp:${phone}`,
    Channel: "whatsapp",
  });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to send WhatsApp OTP");
  }

  return {
    sid: data.sid,
    status: data.status,
    channel: data.channel || "whatsapp",
  };
}

async function twilioVerifyCheck(phone, code) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !serviceSid) {
    throw new Error("Twilio Verify is not configured");
  }

  const body = new URLSearchParams({
    To: `whatsapp:${phone}`,
    Code: code,
  });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify WhatsApp OTP");
  }

  return data.status === "approved";
}

export async function sendOtp({ phone }) {
  const provider = otpProvider();
  const result = await twilioVerifySend(phone);
  return {
    provider,
    providerSid: result.sid,
    codeHash: null,
    metadata: { status: result.status, channel: result.channel },
  };
}

export async function verifyOtp({ phone, challenge, code }) {
  if (!code || typeof code !== "string") {
    return false;
  }

  if (challenge.provider !== "twilio_verify") {
    throw new Error("Unsupported OTP provider in challenge");
  }
  return twilioVerifyCheck(phone, code);
}
