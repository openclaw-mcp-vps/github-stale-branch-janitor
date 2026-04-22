"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ArchiveButtonProps = {
  branchName: string;
  repoFullName: string;
  onArchived: (archivedBranch: string) => void;
};

export function ArchiveButton({ branchName, repoFullName, onArchived }: ArchiveButtonProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setIsArchiving(true);
    setError(null);

    try {
      const response = await fetch("/api/branches/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoFullName,
          branchName
        })
      });

      const payload = (await response.json()) as { error?: string; archivedBranch?: string };

      if (!response.ok || !payload.archivedBranch) {
        throw new Error(payload.error ?? "Archiving failed.");
      }

      onArchived(payload.archivedBranch);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Archiving failed.");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={handleArchive} disabled={isArchiving}>
        {isArchiving ? "Archiving..." : "Archive"}
      </Button>
      {error ? <p className="text-xs text-[#f85149]">{error}</p> : null}
    </div>
  );
}
