import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Geist } from "next/font/google";

import "@/app/globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const appUrl = process.env.APP_URL ?? "https://github-stale-branch-janitor.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "GitHub Stale Branch Janitor",
  description:
    "Find and archive stale GitHub branches older than N days. Keep repos clean without manual branch hunting.",
  applicationName: "GitHub Stale Branch Janitor",
  keywords: [
    "GitHub branch cleanup",
    "stale branch management",
    "engineering productivity",
    "repository hygiene",
  ],
  openGraph: {
    title: "GitHub Stale Branch Janitor",
    description:
      "Connect GitHub, detect stale branches, and archive dead branches on demand or on a schedule.",
    url: appUrl,
    siteName: "GitHub Stale Branch Janitor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Stale Branch Janitor",
    description:
      "Archive stale GitHub branches in minutes instead of spending engineering time on branch cleanup.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(spaceGrotesk.variable, ibmPlexMono.variable, "font-sans", geist.variable)}>
      <body className="bg-[#0d1117] text-[#e6edf3] antialiased">
        <div className="soft-grid min-h-screen">{children}</div>
      </body>
    </html>
  );
}
