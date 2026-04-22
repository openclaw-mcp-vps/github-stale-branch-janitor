import { addDays, isAfter } from "date-fns";
import { NextResponse } from "next/server";

import { getAllEnabledSchedules, updateScheduleLastRun, upsertRecommendation } from "@/lib/database";
import { fetchStaleBranches } from "@/lib/github";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const provided = request.headers.get("x-cron-secret") ?? "";
  const expected = process.env.CRON_SECRET ?? "";

  if (!expected) return false;
  return provided === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron call" }, { status: 401 });
  }

  const schedules = await getAllEnabledSchedules();
  const now = new Date();
  let processed = 0;

  for (const schedule of schedules) {
    const dueAt = schedule.lastRunAt ? addDays(new Date(schedule.lastRunAt), schedule.frequencyDays) : new Date(0);

    if (isAfter(dueAt, now)) {
      continue;
    }

    try {
      const branches = await fetchStaleBranches({
        accessToken: schedule.githubAccessToken,
        repoFullName: schedule.repoFullName,
        thresholdDays: schedule.thresholdDays
      });

      await upsertRecommendation({
        userId: schedule.userId,
        repoFullName: schedule.repoFullName,
        thresholdDays: schedule.thresholdDays,
        branches: branches.map((branch) => ({
          name: branch.name,
          sha: branch.sha,
          daysStale: branch.daysStale,
          lastCommitDate: branch.lastCommitDate,
          lastCommitAuthor: branch.lastCommitAuthor
        }))
      });

      await updateScheduleLastRun(schedule.id, now.toISOString());
      processed += 1;
    } catch {
      continue;
    }
  }

  return NextResponse.json({ ok: true, processed, totalEnabledSchedules: schedules.length });
}
