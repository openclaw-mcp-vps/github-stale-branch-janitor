import { NextResponse } from "next/server";

import { listSchedulesForLogin } from "@/lib/db";
import { getGitHubTokenFromCookies, getViewer, listRepositories } from "@/lib/github";
import { getAccessSession } from "@/lib/paywall";

export async function GET() {
  const access = await getAccessSession();
  if (!access) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const token = await getGitHubTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      {
        connected: false,
        repos: [],
        message: "Connect GitHub to start scanning repositories.",
      },
      { status: 200 },
    );
  }

  try {
    const [viewer, repos] = await Promise.all([getViewer(token), listRepositories(token)]);
    const schedules = await listSchedulesForLogin(viewer.login);

    return NextResponse.json({
      connected: true,
      viewer,
      repos,
      schedules,
      access,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load repositories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
