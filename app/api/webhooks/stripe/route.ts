import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { addOrUpdatePaidCustomer } from "@/lib/db";

type StripeWebhookEvent = {
  type: string;
  data?: {
    object?: {
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
    };
  };
};

function parseStripeSignature(headerValue: string): { timestamp: string; signatures: string[] } | null {
  const parts = headerValue.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

function safeCompareHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const hasMatch = parsed.signatures.some((signature) => safeCompareHex(signature, expectedSignature));
  if (!hasMatch) {
    return false;
  }

  const timestampSeconds = Number(parsed.timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
  return ageSeconds <= 5 * 60;
}

export async function POST(request: Request) {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  if (!verifyStripeSignature(payload, signatureHeader, signingSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const email = event.data?.object?.customer_email ?? event.data?.object?.customer_details?.email;

    if (email) {
      await addOrUpdatePaidCustomer(email, "stripe-webhook");
    }
  }

  return NextResponse.json({ received: true });
}
