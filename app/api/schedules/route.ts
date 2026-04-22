import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getSchedulesByUser, saveSchedule } from "@/lib/database";
import { hasPaidAccess } from "@/lib/paywall";

export const runtime = "nodejs";

const payloadSchema = z.object({
  repoFullName: z.string().min(3),
  thresholdDays: z.number().int().min(1).max(3650),
  frequencyDays: z.number().int().min(1).max(30),
  enabled: z.boolean()
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  if (!hasPaidAccess(cookieStore)) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  const schedules = await getSchedulesByUser(session.user.id);

  return NextResponse.json({
    schedules: schedules.map((schedule) => ({
      repoFullName: schedule.repoFullName,
      thresholdDays: schedule.thresholdDays,
      frequencyDays: schedule.frequencyDays,
      enabled: schedule.enabled,
      lastRunAt: schedule.lastRunAt
    }))
  });
}

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
    return NextResponse.json({ error: "Invalid schedule payload" }, { status: 400 });
  }

  await saveSchedule({
    userId: session.user.id,
    githubAccessToken: session.accessToken,
    repoFullName: payload.repoFullName,
    thresholdDays: payload.thresholdDays,
    frequencyDays: payload.frequencyDays,
    enabled: payload.enabled
  });

  return NextResponse.json({ ok: true });
}
