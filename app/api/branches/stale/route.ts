import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { fetchStaleBranches } from "@/lib/github";
import { hasPaidAccess } from "@/lib/paywall";

export const runtime = "nodejs";

const payloadSchema = z.object({
  repoFullName: z.string().min(3),
  thresholdDays: z.number().int().min(1).max(3650)
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  if (!hasPaidAccess(cookieStore)) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const branches = await fetchStaleBranches({
      accessToken: session.accessToken,
      repoFullName: payload.repoFullName,
      thresholdDays: payload.thresholdDays
    });

    return NextResponse.json({ branches });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to scan stale branches"
      },
      { status: 500 }
    );
  }
}
