import { NextResponse } from "next/server";
import { z } from "zod";

import { findStaleBranches, getGitHubTokenFromCookies } from "@/lib/github";
import { getAccessSession } from "@/lib/paywall";

const querySchema = z.object({
  repo: z.string().min(3),
  days: z.coerce.number().int().min(1).max(3650),
});

export async function GET(request: Request) {
  const access = await getAccessSession();
  if (!access) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const token = await getGitHubTokenFromCookies();
  if (!token) {
    return NextResponse.json({ error: "GitHub connection required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    repo: url.searchParams.get("repo"),
    days: url.searchParams.get("days") ?? "90",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  try {
    const branches = await findStaleBranches(token, parsed.data.repo, parsed.data.days);
    return NextResponse.json({
      repo: parsed.data.repo,
      thresholdDays: parsed.data.days,
      count: branches.length,
      branches,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scan branches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
