import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { addArchiveLog } from "@/lib/database";
import { archiveBranch } from "@/lib/github";
import { hasPaidAccess } from "@/lib/paywall";

export const runtime = "nodejs";

const payloadSchema = z.object({
  repoFullName: z.string().min(3),
  branchName: z.string().min(1)
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.accessToken || !session.user?.id) {
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
    const archived = await archiveBranch({
      accessToken: session.accessToken,
      repoFullName: payload.repoFullName,
      branchName: payload.branchName
    });

    await addArchiveLog({
      userId: session.user.id,
      repoFullName: payload.repoFullName,
      originalBranch: payload.branchName,
      archivedBranch: archived.archivedBranch
    });

    return NextResponse.json({ archivedBranch: archived.archivedBranch });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to archive branch"
      },
      { status: 500 }
    );
  }
}
