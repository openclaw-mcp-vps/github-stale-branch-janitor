import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://github-stale-branch-janitor.example.com"),
  title: "GitHub Stale Branch Janitor",
  description:
    "Find stale GitHub branches older than your policy, review commit ownership, and archive in one click with scheduled cleanup recommendations.",
  keywords: [
    "github stale branches",
    "branch cleanup",
    "engineering productivity",
    "repository hygiene",
    "dev tools"
  ],
  openGraph: {
    title: "GitHub Stale Branch Janitor",
    description:
      "Stop dead branches from piling up. Scan repos, surface stale refs by author/date, and archive safely with recurring cleanup policies.",
    type: "website",
    url: "https://github-stale-branch-janitor.example.com",
    siteName: "GitHub Stale Branch Janitor"
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Stale Branch Janitor",
    description:
      "Find and archive stale GitHub branches older than N days with one-click cleanup and auto-scheduled scans."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
