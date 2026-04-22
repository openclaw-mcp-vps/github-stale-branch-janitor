import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { fetchUserRepositories } from "@/lib/github";
import { hasPaidAccess } from "@/lib/paywall";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  if (!hasPaidAccess(cookieStore)) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  try {
    const repos = await fetchUserRepositories(session.accessToken);
    return NextResponse.json({ repos });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load repositories"
      },
      { status: 500 }
    );
  }
}
