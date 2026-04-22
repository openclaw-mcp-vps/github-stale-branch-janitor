import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getRecommendationsByUser } from "@/lib/database";
import { hasPaidAccess } from "@/lib/paywall";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  if (!hasPaidAccess(cookieStore)) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  const recommendations = await getRecommendationsByUser(session.user.id);
  return NextResponse.json({ recommendations });
}
