export type UserRole = "admin" | "sales" | "viewer";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  exp: number; // Unix timestamp in ms
}

export const AUTH_COOKIE_NAME = "arcon_session";

const encoder = new TextEncoder();

export function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.ENCRYPTION_SECRET ||
    "arcon-default-secure-secret-3dices-2026"
  );
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "arcon2026!";
}

export const TEAM_USERS = [
  {
    id: "user-deep",
    email: "deep@3dices.com",
    name: "Deep Mehta",
    role: "admin" as const,
  },
  {
    id: "user-sales1",
    email: "sales1@3dices.com",
    name: "Sales Lead",
    role: "sales" as const,
  },
  {
    id: "user-sales2",
    email: "sales2@3dices.com",
    name: "Business Dev",
    role: "sales" as const,
  },
];

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a signed, tamper-proof session token with a 7-day expiration.
 */
export async function signSession(
  user: Omit<UserSession, "exp">,
  secret: string = getAuthSecret()
): Promise<string> {
  const session: UserSession = {
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(session)).toString("base64url");
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadBase64));
  const signatureBase64 = Buffer.from(signature).toString("base64url");
  return `${payloadBase64}.${signatureBase64}`;
}

/**
 * Verifies a session token. Returns UserSession if valid, or null if forged/expired.
 */
export async function verifySession(
  token: string,
  secret: string = getAuthSecret()
): Promise<UserSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadBase64, signatureBase64] = parts;
    const key = await getHmacKey(secret);
    const signature = Buffer.from(signatureBase64, "base64url");
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(payloadBase64)
    );
    if (!isValid) return null;

    const session: UserSession = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8")
    );
    if (Date.now() > session.exp) return null;
    return session;
  } catch {
    return null;
  }
}
