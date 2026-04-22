import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextResponse } from "next/server";

export const PAYWALL_COOKIE_NAME = "sbj_access";

type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined;
};

type AccessPayload = {
  email: string;
  grantedAt: string;
};

function getCookieSecret() {
  return (
    process.env.PAYWALL_COOKIE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "unsafe-dev-secret-change-me"
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLength), "base64").toString("utf8");
}

function sign(rawPayload: string) {
  return createHmac("sha256", getCookieSecret()).update(rawPayload).digest("base64url");
}

export function createAccessCookieToken(email: string) {
  const payload: AccessPayload = {
    email: email.trim().toLowerCase(),
    grantedAt: new Date().toISOString()
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function readAccessCookieToken(token: string | undefined) {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) return null;

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AccessPayload;
    if (!payload.email || !payload.grantedAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hasPaidAccess(cookieStore: CookieStoreLike) {
  const token = cookieStore.get(PAYWALL_COOKIE_NAME)?.value;
  return Boolean(readAccessCookieToken(token));
}

export function setPaidAccessCookie(response: NextResponse, email: string) {
  response.cookies.set(PAYWALL_COOKIE_NAME, createAccessCookieToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
}
