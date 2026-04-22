import { NextResponse } from "next/server";
import { z } from "zod";

import { hasPaidCustomer } from "@/lib/db";
import { setAccessCookie } from "@/lib/paywall";

const claimSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "A valid purchase email is required" }, { status: 400 });
  }

  const isPaid = await hasPaidCustomer(parsed.data.email);

  if (!isPaid) {
    return NextResponse.json(
      {
        error:
          "No paid subscription found for that email yet. If you just purchased, wait a minute for Stripe webhook delivery and try again.",
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ success: true });
  return setAccessCookie(response, parsed.data.email);
}
