import { NextResponse } from "next/server";

import { createOAuthState, GITHUB_STATE_COOKIE, getGitHubAuthUrl } from "@/lib/github";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = createOAuthState();
    const authUrl = getGitHubAuthUrl(state);
    const response = NextResponse.redirect(authUrl);

    response.cookies.set({
      name: GITHUB_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    const nextPath = url.searchParams.get("next");
    if (nextPath) {
      response.cookies.set({
        name: "github_oauth_next",
        value: nextPath,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initiate GitHub auth";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
