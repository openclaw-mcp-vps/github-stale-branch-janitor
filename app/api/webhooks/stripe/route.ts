import { NextResponse } from "next/server";

import { upsertEntitlement } from "@/lib/database";
import { verifyStripeWebhookSignature } from "@/lib/stripe";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      customer_email?: string;
      customer_details?: {
        email?: string | null;
      };
      receipt_email?: string | null;
    };
  };
};

export const runtime = "nodejs";

function pickEmail(event: StripeEvent) {
  return (
    event.data.object.customer_email ??
    event.data.object.customer_details?.email ??
    event.data.object.receipt_email ??
    null
  );
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const verified = verifyStripeWebhookSignature(payload, signatureHeader, secret);

  if (!verified) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_link.payment_completed") {
    const email = pickEmail(event);
    if (email) {
      await upsertEntitlement(email, event.id);
    }
  }

  return NextResponse.json({ received: true });
}
