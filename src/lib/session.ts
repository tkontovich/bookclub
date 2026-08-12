import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "bookclub_session";
export const MEMBER_COOKIE_NAME = "bookclub_member";

const SESSION_PAYLOAD = "authenticated";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Missing SESSION_SECRET env var. Copy .env.local.example to .env.local and fill it in.",
    );
  }
  return secret;
}

function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(): string {
  return `${SESSION_PAYLOAD}.${hmac(getSessionSecret(), SESSION_PAYLOAD)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (payload !== SESSION_PAYLOAD || !signature) return false;
  return constantTimeEqual(signature, hmac(getSessionSecret(), SESSION_PAYLOAD));
}

export function isCorrectSitePassword(candidate: string): boolean {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    throw new Error(
      "Missing SITE_PASSWORD env var. Copy .env.local.example to .env.local and fill it in.",
    );
  }
  // Compare HMACs of both values (using the session secret as the key) so
  // the comparison is constant-time and never leaks password length.
  const secret = getSessionSecret();
  return constantTimeEqual(hmac(secret, candidate), hmac(secret, sitePassword));
}
