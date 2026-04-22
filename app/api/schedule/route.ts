import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { listSchedulesForLogin, upsertSchedule, deleteSchedule } from "@/lib/db";
import { encryptText } from "@/lib/crypto";
import { getGitHubTokenFromCookies, getViewer } from "@/lib/github";
import { getAccessSession } from "@/lib/paywall";
import { getNextRunAt } from "@/lib/schedule";

const scheduleSchema = z.object({
  repo: z.string().min(3),
  thresholdDays: z.coerce.number().int().min(1).max(3650),
  cadence: z.enum(["daily", "weekly"]),
  timezone: z.string().min(2).max(120).default("UTC"),
});

export async function GET() {
  const access = await getAccessSession();
  if (!access) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const token = await getGitHubTokenFromCookies();
  if (!token) {
    return NextResponse.json({ error: "GitHub connection required" }, { status: 401 });
  }

  try {
    const viewer = await getViewer(token);
    const schedules = await listSchedulesForLogin(viewer.login);
    return NextResponse.json({ schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list schedules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
  const parsed = scheduleSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid schedule payload" }, { status: 400 });
  }

  try {
    const viewer = await getViewer(token);
    const now = new Date().toISOString();
    const id = createHash("sha256")
      .update(`${viewer.login}:${parsed.data.repo}`)
      .digest("hex")
      .slice(0, 24);

    const existingSchedules = await listSchedulesForLogin(viewer.login);
    const existing = existingSchedules.find((entry) => entry.id === id);

    const schedule = await upsertSchedule({
      id,
      githubLogin: viewer.login,
      repo: parsed.data.repo,
      thresholdDays: parsed.data.thresholdDays,
      cadence: parsed.data.cadence,
      timezone: parsed.data.timezone,
      nextRunAt: getNextRunAt(parsed.data.cadence),
      enabled: true,
      encryptedGithubToken: encryptText(token, "TOKEN_ENCRYPTION_SECRET"),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await getAccessSession();
  if (!access) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const token = await getGitHubTokenFromCookies();
  if (!token) {
    return NextResponse.json({ error: "GitHub connection required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Schedule id is required" }, { status: 400 });
  }

  try {
    const viewer = await getViewer(token);
    const schedules = await listSchedulesForLogin(viewer.login);

    if (!schedules.some((entry) => entry.id === id)) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const removed = await deleteSchedule(id);
    return NextResponse.json({ success: removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
