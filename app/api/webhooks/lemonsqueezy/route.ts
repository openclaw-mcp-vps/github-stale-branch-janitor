import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      error: "LemonSqueezy webhook is deprecated in this build. Configure Stripe webhook at /api/webhooks/stripe."
    },
    { status: 410 }
  );
}
