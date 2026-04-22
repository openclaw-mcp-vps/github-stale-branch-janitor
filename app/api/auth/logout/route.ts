import { NextResponse } from "next/server";

import { GITHUB_TOKEN_COOKIE } from "@/lib/github";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: GITHUB_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
