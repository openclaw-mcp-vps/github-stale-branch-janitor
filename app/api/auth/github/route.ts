import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl") ?? "/dashboard";
  const destination = new URL(`/api/auth/signin/github?callbackUrl=${encodeURIComponent(callbackUrl)}`, url.origin);
  return NextResponse.redirect(destination);
}
