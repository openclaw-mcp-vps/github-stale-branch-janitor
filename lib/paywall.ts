import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { signPayload, verifySignedPayload } from "@/lib/crypto";

const ACCESS_COOKIE_NAME = "gbj_access";
const ACCESS_TTL_DAYS = 365;

type AccessPayload = {
  email: string;
  exp: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function buildAccessToken(payload: AccessPayload): string {
  const payloadString = JSON.stringify(payload);
  const encodedPayload = toBase64Url(payloadString);
  const signature = signPayload(encodedPayload, "PAYWALL_COOKIE_SECRET");
  return `${encodedPayload}.${signature}`;
}

function parseAccessToken(token: string): AccessPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  if (!verifySignedPayload(encodedPayload, signature, "PAYWALL_COOKIE_SECRET")) {
    return null;
  }

  try {
    const rawPayload = fromBase64Url(encodedPayload);
    const payload = JSON.parse(rawPayload) as AccessPayload;

    if (!payload.email || typeof payload.exp !== "number") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAccessSession(): Promise<AccessPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = parseAccessToken(token);
  if (!payload) {
    return null;
  }

  if (payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

export function setAccessCookie(response: NextResponse, email: string): NextResponse {
  const exp = Date.now() + ACCESS_TTL_DAYS * 24 * 60 * 60 * 1000;
  const token = buildAccessToken({
    email: email.trim().toLowerCase(),
    exp,
  });

  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TTL_DAYS * 24 * 60 * 60,
  });

  return response;
}

export function clearAccessCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export const paywallCookieName = ACCESS_COOKIE_NAME;
