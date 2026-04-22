"use client";

import { useState } from "react";

import { Archive } from "lucide-react";

import { Button } from "@/components/ui/button";

type ArchiveButtonProps = {
  repo: string;
  branchName: string;
  onArchived: (branchName: string) => void;
};

export function ArchiveButton({ repo, branchName, onArchived }: ArchiveButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    setLoading(true);

    try {
      const response = await fetch("/api/branches/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo,
          branches: [branchName],
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to archive branch");
      }

      const payload = (await response.json()) as {
        results: Array<{ branch: string; status: string }>;
      };

      if (payload.results.some((result) => result.branch === branchName && result.status === "archived")) {
        onArchived(branchName);
      }
    } catch {
      // The parent list displays batch/status messaging, so this action stays intentionally quiet.
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleArchive} disabled={loading}>
      <Archive className="h-3.5 w-3.5" />
      {loading ? "Archiving" : "Archive"}
    </Button>
  );
}
