import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeCodeForAccessToken,
  GITHUB_STATE_COOKIE,
  GITHUB_TOKEN_COOKIE,
  getViewer,
} from "@/lib/github";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get(GITHUB_STATE_COOKIE)?.value;
  const nextPath = cookieStore.get("github_oauth_next")?.value ?? "/dashboard";

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error)}`, url.origin));
  }

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_oauth_state", url.origin));
  }

  try {
    const token = await exchangeCodeForAccessToken(code);
    await getViewer(token);

    const response = NextResponse.redirect(new URL(nextPath, url.origin));
    response.cookies.set({
      name: GITHUB_TOKEN_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set({
      name: GITHUB_STATE_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set({
      name: "github_oauth_next",
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (authError) {
    const message = authError instanceof Error ? authError.message : "GitHub OAuth callback failed";
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, url.origin),
    );
  }
}
