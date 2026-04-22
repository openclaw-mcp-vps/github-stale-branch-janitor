import { NextResponse } from "next/server";
import { z } from "zod";

import { archiveBranches, getGitHubTokenFromCookies } from "@/lib/github";
import { getAccessSession } from "@/lib/paywall";

const bodySchema = z.object({
  repo: z.string().min(3),
  branches: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const access = await getAccessSession();
  if (!access) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const token = await getGitHubTokenFromCookies();
  if (!token) {
    return NextResponse.json({ error: "GitHub connection required" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const results = await archiveBranches(token, parsed.data.repo, parsed.data.branches);
    const archived = results.filter((result) => result.status === "archived").length;

    return NextResponse.json({
      repo: parsed.data.repo,
      archived,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive branches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
