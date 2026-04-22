"use client";

import { useMemo, useState } from "react";

import { format, formatDistanceToNowStrict } from "date-fns";

import { ArchiveButton } from "@/components/ArchiveButton";

export type StaleBranchItem = {
  name: string;
  sha: string;
  branchUrl: string;
  commitDate: string;
  commitAuthor: string;
  commitMessage: string;
  daysSinceCommit: number;
  protected: boolean;
};

type StaleBranchListProps = {
  repo: string;
  branches: StaleBranchItem[];
  onArchivedBranches: (branchNames: string[]) => void;
};

export function StaleBranchList({ repo, branches, onArchivedBranches }: StaleBranchListProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [batchArchiving, setBatchArchiving] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const selectedBranchNames = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([key]) => key),
    [selected],
  );

  function toggle(name: string) {
    setSelected((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  function toggleAll() {
    if (selectedBranchNames.length === branches.length) {
      setSelected({});
      return;
    }

    const next: Record<string, boolean> = {};
    for (const branch of branches) {
      next[branch.name] = true;
    }

    setSelected(next);
  }

  async function archiveSelected() {
    if (selectedBranchNames.length === 0) {
      return;
    }

    setBatchArchiving(true);
    setBatchMessage(null);

    try {
      const response = await fetch("/api/branches/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo,
          branches: selectedBranchNames,
        }),
      });

      const payload = (await response.json()) as {
        archived?: number;
        results?: Array<{ branch: string; status: "archived" | "failed" | "skipped" }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Batch archive failed");
      }

      const archivedBranches = (payload.results ?? [])
        .filter((result) => result.status === "archived")
        .map((result) => result.branch);

      onArchivedBranches(archivedBranches);
      setBatchMessage(`Archived ${archivedBranches.length} branches.`);
      setSelected({});
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "Archive request failed");
    } finally {
      setBatchArchiving(false);
    }
  }

  if (branches.length === 0) {
    return (
      <section className="surface rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-[#f0f6fc]">Stale Branches</h2>
        <p className="mt-2 text-sm text-[#8b949e]">No stale branches matched your threshold for this repository.</p>
      </section>
    );
  }

  return (
    <section className="surface rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f0f6fc]">Stale Branches</h2>
          <p className="mt-1 text-sm text-[#8b949e]">{branches.length} branches are older than your threshold.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-md border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] transition hover:border-[#58a6ff]"
          >
            {selectedBranchNames.length === branches.length ? "Unselect all" : "Select all"}
          </button>
          <button
            type="button"
            onClick={archiveSelected}
            disabled={selectedBranchNames.length === 0 || batchArchiving}
            className="rounded-md bg-[#1f6feb] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {batchArchiving ? "Archiving" : `Archive selected (${selectedBranchNames.length})`}
          </button>
        </div>
      </div>

      {batchMessage ? <p className="mt-3 text-sm text-[#8b949e]">{batchMessage}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#30363d] text-left text-xs uppercase tracking-[0.08em] text-[#8b949e]">
              <th className="px-2 py-2">Pick</th>
              <th className="px-2 py-2">Branch</th>
              <th className="px-2 py-2">Last Commit</th>
              <th className="px-2 py-2">Author</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => {
              const commitDate = new Date(branch.commitDate);
              return (
                <tr key={branch.name} className="border-b border-[#21262d] align-top">
                  <td className="px-2 py-3">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[branch.name])}
                      onChange={() => toggle(branch.name)}
                      className="h-4 w-4 rounded border-[#30363d] bg-[#0d1117]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <a
                      href={branch.branchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#58a6ff] hover:underline"
                    >
                      {branch.name}
                    </a>
                    <p className="mt-1 max-w-[280px] truncate text-xs text-[#8b949e]">{branch.commitMessage}</p>
                    <p className="mono mt-1 text-xs text-[#6e7681]">{branch.sha.slice(0, 8)}</p>
                  </td>
                  <td className="px-2 py-3 text-[#c9d1d9]">
                    <p>{formatDistanceToNowStrict(commitDate, { addSuffix: true })}</p>
                    <p className="mt-1 text-xs text-[#8b949e]">{format(commitDate, "yyyy-MM-dd HH:mm 'UTC'")}</p>
                  </td>
                  <td className="px-2 py-3 text-[#c9d1d9]">{branch.commitAuthor}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        branch.protected
                          ? "bg-[#8957e5]/20 text-[#d2a8ff]"
                          : "bg-[#1f6feb]/20 text-[#7fb3ff]"
                      }`}
                    >
                      {branch.protected ? "Protected" : `${branch.daysSinceCommit} days stale`}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {branch.protected ? (
                      <span className="text-xs text-[#8b949e]">Cannot archive protected branch</span>
                    ) : (
                      <ArchiveButton
                        repo={repo}
                        branchName={branch.name}
                        onArchived={(name) => onArchivedBranches([name])}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
