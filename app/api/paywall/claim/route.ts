import { NextResponse } from "next/server";
import { z } from "zod";

import { hasEntitlement } from "@/lib/database";
import { setPaidAccessCookie } from "@/lib/paywall";

export const runtime = "nodejs";

const payloadSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "A valid purchase email is required." }, { status: 400 });
  }

  const entitled = await hasEntitlement(payload.email);
  if (!entitled) {
    return NextResponse.json(
      {
        error: "No completed checkout was found for that email yet. If you just paid, wait a few seconds and try again."
      },
      { status: 404 }
    );
  }

  const response = NextResponse.json({ ok: true });
  setPaidAccessCookie(response, payload.email);
  return response;
}
