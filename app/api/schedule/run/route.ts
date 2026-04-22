import { NextResponse } from "next/server";

import { decryptText } from "@/lib/crypto";
import { listDueSchedules, upsertSchedule } from "@/lib/db";
import { archiveBranches, findStaleBranches } from "@/lib/github";
import { getNextRunAt } from "@/lib/schedule";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("key") === secret;
}

async function runCleanupForSchedule(schedule: {
  repo: string;
  thresholdDays: number;
  cadence: "daily" | "weekly";
  encryptedGithubToken: string;
}) {
  const token = decryptText(schedule.encryptedGithubToken, "TOKEN_ENCRYPTION_SECRET");
  const staleBranches = await findStaleBranches(token, schedule.repo, schedule.thresholdDays);

  if (staleBranches.length === 0) {
    return {
      scanned: 0,
      archived: 0,
      failures: 0,
    };
  }

  const archiveResults = await archiveBranches(
    token,
    schedule.repo,
    staleBranches.map((branch) => branch.name),
  );

  return {
    scanned: staleBranches.length,
    archived: archiveResults.filter((entry) => entry.status === "archived").length,
    failures: archiveResults.filter((entry) => entry.status === "failed").length,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueSchedules = await listDueSchedules(new Date());

  if (dueSchedules.length === 0) {
    return NextResponse.json({
      ok: true,
      ran: 0,
      results: [],
    });
  }

  const results: Array<{
    id: string;
    repo: string;
    archived: number;
    scanned: number;
    failures: number;
    error?: string;
  }> = [];

  for (const schedule of dueSchedules) {
    try {
      const runResult = await runCleanupForSchedule(schedule);

      await upsertSchedule({
        ...schedule,
        nextRunAt: getNextRunAt(schedule.cadence),
        updatedAt: new Date().toISOString(),
      });

      results.push({
        id: schedule.id,
        repo: schedule.repo,
        archived: runResult.archived,
        scanned: runResult.scanned,
        failures: runResult.failures,
      });
    } catch (error) {
      await upsertSchedule({
        ...schedule,
        nextRunAt: getNextRunAt(schedule.cadence),
        updatedAt: new Date().toISOString(),
      });

      results.push({
        id: schedule.id,
        repo: schedule.repo,
        archived: 0,
        scanned: 0,
        failures: 1,
        error: error instanceof Error ? error.message : "Scheduled cleanup failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ran: dueSchedules.length,
    results,
  });
}
